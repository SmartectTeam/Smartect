package org.smartect.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import org.msgpack.jackson.dataformat.MessagePackFactory;
import org.smartect.dto.CombinedJsonDTO;
import org.smartect.dto.EventJsonDTO;
import org.smartect.dto.EventMapDTO;
import org.smartect.entity.CamEntity;
import org.smartect.entity.EventLogEntity;
import org.smartect.repository.EventLogRepository;
import org.smartect.repository.CamRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;

@Service
@RequiredArgsConstructor
public class EventJsonService {

    private final ObjectMapper msgPackMapper = new ObjectMapper(new MessagePackFactory());
    private final Map<String, LocalDateTime> lastEventTime = new ConcurrentHashMap<>();
    private final CaptureService captureService;

    @Autowired
    private EventLogRepository eventLogRepository;

    @Autowired
    private CamRepository camRepository;

    // 쿨다운 시간 - 같은 이벤트를 이 시간 내 저장 X
    private static final long COOLDOWN_SECONDS = 10;

    // 저장할 이벤트 타입 목록
    private static final Set<String> ALLOWED_EVENT_TYPES = Set.of(
            "punching",
            "pushing",
            "fall",
            "threat",      // threat(zone), threat(locked) 모두 포함
            "smoke",
            "fire"
    );


    @Async
    public void process(byte[] combined_json) {
        try {
            CombinedJsonDTO combined_data = msgPackMapper.readValue(combined_json, CombinedJsonDTO.class);

            // action 이벤트
            List<EventJsonDTO> actionEvents = combined_data.getAction_json();
            List<EventMapDTO> actionMaps = combined_data.getAction_map();
            if (actionEvents != null) {
                for (int i = 0; i < actionEvents.size(); i++) {
                    EventJsonDTO event = actionEvents.get(i);
                    EventMapDTO map = (actionMaps != null && i < actionMaps.size()) ? actionMaps.get(i) : null;
                    processEvent(event, map, combined_data.getImg_bytes());
                }
            }

            // fire 이벤트
            List<EventJsonDTO> fireEvents = combined_data.getFire_json();
            List<EventMapDTO> fireMaps = combined_data.getFire_map();
            if (fireEvents != null) {
                for (int i = 0; i < fireEvents.size(); i++) {
                    EventJsonDTO event = fireEvents.get(i);
                    EventMapDTO map = (fireMaps != null && i < fireMaps.size()) ? fireMaps.get(i) : null;
                    processEvent(event, map, combined_data.getImg_bytes());
                }
            }


        } catch (Exception e) {
            System.err.println(e.getMessage());
        }

    }

    // 이벤트 처리
    private void processEvent(EventJsonDTO event, EventMapDTO map, byte[] Img_bytes) {
        String eventType = event.getEvent_type();

        // 필터링
        if (!isAllowedEventType(eventType)) {
            return;
        }

        // 쿨다운
        if (!shouldSaveEvent(event.getCam_no(), eventType)) {
            return;
        }

        // 스크린 샷
        String screenshotPath = null;
        if (Img_bytes != null && map != null) {
            try {
                screenshotPath = captureService.captureWithBoundingBox(
                        Img_bytes,
                        event.getCam_no(),
                        eventType,
                        map.getX1(),
                        map.getY1(),
                        map.getX2(),
                        map.getY2(),
                        map.getConfidence()
                );
            } catch (Exception e) {
                System.err.println("스크린샷 캡처 실패: " + e.getMessage());
            }
        }

        // DB
        saveDetectionLog(
                event.getCam_no(),
                eventType,
                event.getScreenshot_path()
        );

        System.out.println("이벤트 저장 완료: cam_no=" + event.getCam_no() +
                ", type=" + eventType +
                ", screenshot=" + screenshotPath);
    }

    private boolean isAllowedEventType(String eventType) {
        if (eventType == null || eventType.isEmpty()) {
            return false;
        }

        String lowerEventType = eventType.toLowerCase();

        // 예외 제외
        if (lowerEventType.equals("safe") || lowerEventType.equals("unknown")) {
            return false;
        }

        // threat(zone), threat(locked)
        for (String allowed : ALLOWED_EVENT_TYPES) {
            if (lowerEventType.startsWith(allowed)) {
                return true;
            }
        }

        return false;
    }


    // 이벤트 저장 여부 판단 (쿨다운 체크)
    private boolean shouldSaveEvent(int camNo, String eventType) {
        String key = camNo + "_" + eventType.toLowerCase();
        LocalDateTime now = LocalDateTime.now();
        LocalDateTime lastTime = lastEventTime.get(key);

        // 첫 이벤트거나, 쿨다운 시간이 지나면 저장
        if (lastTime == null || Duration.between(lastTime, now).getSeconds() >= COOLDOWN_SECONDS) {
            lastEventTime.put(key, now);
            return true;
        }

        return false;
    }


    @Transactional
    public EventLogEntity saveDetectionLog(int camNo, String eventType, String screenshotPath) {
        CamEntity camEntity = camRepository.findById((long) camNo)
                .orElseThrow(() -> new IllegalArgumentException("카메라가 존재하지 않습니다. cam_no : " + camNo));

        EventLogEntity entity = EventLogEntity.create(camEntity, eventType, screenshotPath);
        return eventLogRepository.save(entity);
    }

}
package org.smartect.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.transaction.Transactional;
import org.msgpack.jackson.dataformat.MessagePackFactory;
import org.smartect.dto.CombinedJsonDTO;
import org.smartect.dto.EventJsonDTO;
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
import java.util.concurrent.atomic.AtomicBoolean;

@Service
public class EventJsonService {

    private final ObjectMapper msgPackMapper = new ObjectMapper(new MessagePackFactory());
    private final Map<String, LocalDateTime> lastEventTime = new ConcurrentHashMap<>();

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

    // 넘어오는 JSON 데이터 확인용
    private final AtomicBoolean printed = new AtomicBoolean(false);

    @Async
    public void process(byte[] combined_json) {
        try {
            CombinedJsonDTO combined_data = msgPackMapper.readValue(combined_json, CombinedJsonDTO.class);

            // action 이벤트
            List<EventJsonDTO> actionEvents = combined_data.getAction_json();
            if (actionEvents != null) {
                for (EventJsonDTO event : actionEvents) {
                    processEvent(event);
                }
            }

            // fire 이벤트
            List<EventJsonDTO> fireEvents = combined_data.getFire_json();
            if (fireEvents != null) {
                for (EventJsonDTO event : fireEvents) {
                    processEvent(event);
                }
            }


        } catch (Exception e) {
            System.err.println(e.getMessage());
        }

    }

    // 이벤트 처리
    private void processEvent(EventJsonDTO event) {
        String eventType = event.getEvent_type();

        // 필터링
        if (!isAllowedEventType(eventType)) {
            return;
        }

        // ?

        // 쿨다운
        if (!shouldSaveEvent(event.getCam_no(), eventType)) {
            return;
        }

        // DB
        saveDetectionLog(
                event.getCam_no(),
                eventType,
                event.getScreenshot_path()
        );
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
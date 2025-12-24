
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

    private static final long COOLDOWN_SECONDS = 10;

    private static final Set<String> ALLOWED_EVENT_TYPES = Set.of(
            "punching",
            "pushing",
            "fall",
            "threat",
            "smoke",
            "fire"
    );

    @Async
    public void process(byte[] combined_json) {
        try {
            CombinedJsonDTO combined_data = msgPackMapper.readValue(combined_json, CombinedJsonDTO.class);
            byte[] img_bytes = combined_data.getImg_bytes();

            // action 이벤트 처리
            List<EventJsonDTO> actionEvents = combined_data.getAction_json();
            List<EventMapDTO> actionMaps = combined_data.getAction_map();
            if (actionEvents != null) {
                for (EventJsonDTO event : actionEvents) {
                    EventMapDTO matchedMap = findMatchingMap(event.getEvent_type(), actionMaps);
                    processEvent(event, matchedMap, img_bytes);
                }
            }

            // fire 이벤트 처리
            List<EventJsonDTO> fireEvents = combined_data.getFire_json();
            List<EventMapDTO> fireMaps = combined_data.getFire_map();
            if (fireEvents != null) {
                for (EventJsonDTO event : fireEvents) {
                    EventMapDTO matchedMap = findMatchingMap(event.getEvent_type(), fireMaps);
                    processEvent(event, matchedMap, img_bytes);
                }
            }

        } catch (Exception e) {
            System.err.println("EventJsonService 처리 오류: " + e.getMessage());
        }
    }

    private EventMapDTO findMatchingMap(String eventType, List<EventMapDTO> maps) {
        if (maps == null || eventType == null) {
            return null;
        }

        for (EventMapDTO map : maps) {
            if (eventType.equalsIgnoreCase(map.getEvent_type())) {
                return map;
            }
        }

        return null;
    }

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

        saveDetectionLog(event.getCam_no(), eventType, screenshotPath);
    }

    private boolean isAllowedEventType(String eventType) {
        if (eventType == null || eventType.isEmpty()) {
            return false;
        }

        String lowerEventType = eventType.toLowerCase();

        if (lowerEventType.equals("safe") || lowerEventType.equals("unknown")) {
            return false;
        }

        for (String allowed : ALLOWED_EVENT_TYPES) {
            if (lowerEventType.startsWith(allowed)) {
                return true;
            }
        }

        return false;
    }

    private boolean shouldSaveEvent(int camNo, String eventType) {
        String key = camNo + "_" + eventType.toLowerCase();
        LocalDateTime now = LocalDateTime.now();
        LocalDateTime lastTime = lastEventTime.get(key);

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
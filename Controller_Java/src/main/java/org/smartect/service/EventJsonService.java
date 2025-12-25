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

import java.time.LocalDateTime;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;

@Service
@RequiredArgsConstructor
public class EventJsonService {

    private final ObjectMapper msgPackMapper = new ObjectMapper(new MessagePackFactory());
    private final CaptureService captureService;

    @Autowired
    private EventLogRepository eventLogRepository;

    @Autowired
    private CamRepository camRepository;

    // ========== 이벤트 감지 추적 ==========
    private final Map<String, LocalDateTime> detectionStartTimes = new ConcurrentHashMap<>();
    private final Map<String, Integer> detectionFrameCounts = new ConcurrentHashMap<>();
    private final Map<String, LocalDateTime> lastDetectionTime = new ConcurrentHashMap<>();
    private final Map<String, LocalDateTime> lastEventSavedTime = new ConcurrentHashMap<>();

    private static final long DETECTION_TIMEOUT_SECONDS = 3;  // 3초간 감지 없으면 초기화
    private static final long EVENT_COOLDOWN_SECONDS = 10;    // 이벤트 저장 후 10초 쿨다운

    private static final Set<String> ALLOWED_EVENT_TYPES = Set.of(
            "punching",
            "pushing",
            "fall",
            "threat",
            "smoke",
            "fire"
    );

    // 이벤트별 감지 조건 설정
    private static class EventDetectionConfig {
        String type;  // "instant", "time", "frame"
        int threshold;

        EventDetectionConfig(String type, int threshold) {
            this.type = type;
            this.threshold = threshold;
        }
    }

    private static final Map<String, EventDetectionConfig> EVENT_CONFIGS = Map.of(
            "punching", new EventDetectionConfig("instant", 1),
            "pushing", new EventDetectionConfig("instant", 1),
            "fall", new EventDetectionConfig("time", 5),      // 5초
            "threat", new EventDetectionConfig("time", 2),    // 2초
            "smoke", new EventDetectionConfig("frame", 5),    // 5프레임
            "fire", new EventDetectionConfig("frame", 5)      // 5프레임
    );

    @Async
    public void process(byte[] combined_json) {
        try {
            CombinedJsonDTO combined_data = msgPackMapper.readValue(combined_json, CombinedJsonDTO.class);
            byte[] img_bytes = combined_data.getImg_bytes();

            // 오래된 감지 정보 정리
            cleanupStaleDetections();

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

        if (!isAllowedEventType(eventType)) {
            return;
        }

        if (!shouldTriggerAlert(event.getCam_no(), eventType)) {
            return;
        }

        // 알림 조건 만족 시 저장
        if (shouldSaveEventWithCooldown(event.getCam_no(), eventType)) {
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

            // 저장 후 추적 초기화
            resetDetectionTracking(event.getCam_no(), eventType);
        }
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

    private boolean shouldTriggerAlert(int camNo, String eventType) {
        EventDetectionConfig config = EVENT_CONFIGS.get(eventType.toLowerCase());
        if (config == null) return false;

        String key = camNo + "_" + eventType.toLowerCase();
        LocalDateTime now = LocalDateTime.now();

        // 마지막 감지 시간 업데이트
        lastDetectionTime.put(key, now);

        switch (config.type) {
            case "instant":
                // 즉시 알림
                return true;

            case "time":
                // 시간 기반
                LocalDateTime startTime = detectionStartTimes.get(key);

                if (startTime == null) {
                    detectionStartTimes.put(key, now);
                    return false;
                }

                long duration = java.time.Duration.between(startTime, now).getSeconds();
                if (duration >= config.threshold) {
                    return true;
                }
                return false;

            case "frame":
                // 프레임 기반
                Integer count = detectionFrameCounts.getOrDefault(key, 0);
                count++;
                detectionFrameCounts.put(key, count);

                if (count >= config.threshold) {
                    return true;
                }
                return false;

            default:
                return false;
        }
    }

    private boolean shouldSaveEventWithCooldown(int camNo, String eventType) {
        String key = camNo + "_" + eventType.toLowerCase();
        LocalDateTime now = LocalDateTime.now();
        LocalDateTime lastSavedTime = lastEventSavedTime.get(key);

        // 쿨다운
        if (lastSavedTime != null) {
            long secondsSinceLastSave = java.time.Duration.between(lastSavedTime, now).getSeconds();
            if (secondsSinceLastSave < EVENT_COOLDOWN_SECONDS) {
                return false;
            }
        }

        lastEventSavedTime.put(key, now);
        return true;
    }

    private void cleanupStaleDetections() {
        LocalDateTime now = LocalDateTime.now();

        // 3초간 감지 없는 이벤트는 초기화
        lastDetectionTime.entrySet().removeIf(entry -> {
            long secondsSinceLastDetection = java.time.Duration.between(entry.getValue(), now).getSeconds();
            if (secondsSinceLastDetection > DETECTION_TIMEOUT_SECONDS) {
                String key = entry.getKey();
                detectionStartTimes.remove(key);
                detectionFrameCounts.remove(key);
                return true;
            }
            return false;
        });
    }

    private void resetDetectionTracking(int camNo, String eventType) {
        String key = camNo + "_" + eventType.toLowerCase();
        detectionStartTimes.remove(key);
        detectionFrameCounts.remove(key);
        lastDetectionTime.remove(key);
    }

    @Transactional
    public EventLogEntity saveDetectionLog(int camNo, String eventType, String screenshotPath) {
        CamEntity camEntity = camRepository.findById((long) camNo)
                .orElseThrow(() -> new IllegalArgumentException("카메라가 존재하지 않습니다. cam_no : " + camNo));

        EventLogEntity entity = EventLogEntity.create(camEntity, eventType, screenshotPath);
        return eventLogRepository.save(entity);
    }
}
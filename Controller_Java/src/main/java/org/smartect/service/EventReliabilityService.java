package org.smartect.service;

import lombok.RequiredArgsConstructor;
import org.smartect.common.enums.EventCategory;
import org.smartect.dto.EventJsonDTO;
import org.smartect.handler.EventPolicyProperties;
import org.smartect.handler.EventState;
import org.smartect.handler.EventTypeClassifier;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.time.LocalDateTime;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@Service
@RequiredArgsConstructor
public class EventReliabilityService {

    private final EventTypeClassifier classifier;
    private final EventPolicyProperties props;
    private final EventLogService eventLogService;

    // (camNo:eventType) -> EventState
    private final Map<String, EventState> stateMap = new ConcurrentHashMap<>();

    /**
     * 🔹 이벤트 단일 진입점
     * - SAFE 필터링
     * - 지속 시간 기반 신뢰도 판단
     * - 중복 저장 방지
     */
    public void process(EventJsonDTO e) {
        if (e == null || e.getEvent_type() == null) return;

        final String eventType = e.getEvent_type().trim();
        final EventCategory category = classifier.classify(eventType);

        // 1️⃣ SAFE 이벤트는 무조건 무시
        if (category == EventCategory.SAFE) return;

        // 2️⃣ event_time 파싱 (String → LocalDateTime)
        final LocalDateTime eventTime = parseEventTime(e.getEvent_time());

        // 3️⃣ 위험도별 임계 시간 결정
        final int thresholdSeconds =
                (category == EventCategory.DANGER)
                        ? props.getDangerSeconds()
                        : props.getWarningSeconds();

        final String key = buildKey(e.getCam_no(), eventType);

        // 4️⃣ 상태 조회 또는 생성
        EventState state = stateMap.computeIfAbsent(
                key,
                k -> new EventState(eventTime)
        );

        // 5️⃣ 상태 동기화 블록
        synchronized (state) {

            // (A) 이벤트 끊김 판단
            long gapSeconds = Duration.between(
                    state.getLastSeen(),
                    eventTime
            ).getSeconds();

            if (gapSeconds >= props.getEndGapSeconds()) {
                // 이벤트 종료 후 재발생 → 새 이벤트로 리셋
                state.reset(eventTime);
            } else {
                // 정상적으로 이어지는 이벤트
                if (eventTime.isAfter(state.getLastSeen())) {
                    state.updateLastSeen(eventTime);
                }
            }

            // (B) 지속 시간 계산
            long durationSeconds = Duration.between(
                    state.getFirstSeen(),
                    state.getLastSeen()
            ).getSeconds();

            // (C) 임계치 도달 시 1회 DB 저장
            if (!state.isSaved() && durationSeconds >= thresholdSeconds) {

                String screenshotPath =
                        (e.getScreenshot_path() != null)
                                ? e.getScreenshot_path()
                                : "";

                eventLogService.saveDetectionLog(
                        e.getCam_no(),
                        eventType,
                        screenshotPath
                );

                // 중복 저장 방지
                state.markSaved();
            }
        }
    }

    /**
     * 🔹 cam + eventType 기준 key 생성
     */
    private String buildKey(int camNo, String eventType) {
        return camNo + ":" + eventType.toLowerCase();
    }

    // 시간 파싱 실패시 서버시간으로 대체
    private LocalDateTime parseEventTime(String eventTimeStr) {
        try {
            return LocalDateTime.parse(eventTimeStr);
        } catch (Exception e) {
            return LocalDateTime.now();
        }
    }
    // 스케줄러로 상태 정리할 때 쓰는 getter
    public Map<String, EventState> getStateMap() {
        return stateMap;
    }
}

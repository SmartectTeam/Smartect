package org.smartect.handler;


import lombok.RequiredArgsConstructor;
import org.smartect.service.EventReliabilityService;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.Duration;
import java.time.LocalDateTime;
import java.util.Iterator;
import java.util.Map;

@Component
@RequiredArgsConstructor
public class EventStateCleanupScheduler {

    private final EventReliabilityService reliabilityService;
    private final EventPolicyProperties props;

    @Scheduled(fixedDelay = 30_000) // 30초마다 청소
    public void cleanup() {
        Map<String, EventState> map = reliabilityService.getStateMap();
        LocalDateTime now = LocalDateTime.now();

        Iterator<Map.Entry<String, EventState>> it = map.entrySet().iterator();
        while (it.hasNext()) {
            Map.Entry<String, EventState> entry = it.next();
            EventState st = entry.getValue();

            LocalDateTime lastSeen;
            synchronized (st) {
                lastSeen = st.getLastSeen();
            }

            long idle = Duration.between(lastSeen, now).getSeconds();
            if (idle >= props.getCleanupTtlSeconds()) {
                it.remove();
            }
        }
    }
}
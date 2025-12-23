package org.smartect.handler;

import org.smartect.common.enums.EventCategory;
import org.springframework.stereotype.Component;

import java.util.Set;

@Component
public class EventTypeClassifier {
//    #DANGER
//    fire danger
//    #WARNING
//    punching pushing fall threat(zone) threat(locked) smoke warning
//    #SAFE
//    safe walking standing sitting rotating reaching etc safe

    private static final Set<String> SAFE = Set.of(
            "safe", "walking", "standing", "sitting", "rotating", "reaching","etc"
    );
    // 둘 다 해당 없을 시 Warning
    private static final Set<String> DANGER = Set.of(
            "fire","danger"
    );

    public EventCategory classify(String eventType) {
        if (eventType == null) return EventCategory.SAFE;

        String t = eventType.trim().toLowerCase();

        if (DANGER.contains(t)) return EventCategory.DANGER;
        if (SAFE.contains(t)) return EventCategory.SAFE;

        return EventCategory.WARNING;
    }
}

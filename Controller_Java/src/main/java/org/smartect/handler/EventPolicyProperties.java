package org.smartect.handler;

import lombok.Getter;
import lombok.Setter;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

@Getter
@Setter
@Component
// application,properties에 선언해놓은 이벤트 신뢰도 판단 정책(초)
@ConfigurationProperties(prefix = "smartect.event-policy")
public class EventPolicyProperties {
    private int warningSeconds = 8;
    private int dangerSeconds = 3;
    private int endGapSeconds = 5; // 5초 지나면 이벤트 종료 판단
    private int cleanupTtlSeconds = 120;
}
package org.smartect.handler;

import java.time.LocalDateTime;

public class EventState {
    private LocalDateTime firstSeen;
    private LocalDateTime lastSeen;

    private boolean saved; // DB 저장 완료 여부(중복 방지)

    public EventState(LocalDateTime firstSeen) {
        this.firstSeen = firstSeen;
        this.lastSeen = firstSeen;
        this.saved = false;
    }

    public LocalDateTime getFirstSeen() { return firstSeen; }
    public LocalDateTime getLastSeen() { return lastSeen; }
    public boolean isSaved() { return saved; }

    public void updateLastSeen(LocalDateTime t) { this.lastSeen = t; }
    public void markSaved() { this.saved = true; }

    // 이벤트 종료 판단 -> 상태 리섹 ( 새 이벤트로 판단 )
    public void reset(LocalDateTime newFirstSeen) {
        this.firstSeen = newFirstSeen;
        this.lastSeen = newFirstSeen;
        this.saved = false;
    }
}
package org.smartect.entity;

import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;

@Entity
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED) // Entity 접근 제한
@Table(name="event_log")
public class EventLogEntity {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name="event_no")
    private Long eventNo;

    @ManyToOne(fetch = FetchType.LAZY)
    // EventLog 에서 cam 참조(cam에서는 OneToMany명시 필요 없음)
    // CamEntity
    @JoinColumn(name="cam_no",nullable=false) // FK JOIN
    private CamEntity camEntity;

    @Column(name="event_type",length=100,nullable = false)
    private String eventType;
//
//    @Column(name="danger_level")
//    private Integer dangerLevel; // 위험도 0~3?
    @Column(name="screenshot_path",length=500,nullable = false)
    private String screenshotPath; // Python에서 저장, 경로만 넘어옴

    @Lob // DB : TEXT
    @Column(name="memo")
    private String memo;

    @CreationTimestamp
    @Column(name="created_at",nullable = false)
    private LocalDateTime createdAt;

    @Column(name="checked_at")
    private LocalDateTime checkedAt;



    // JPA 영속성 컨텍스트 + 더티체킹
    // 때문에 객체 값 바꾸면 자동으로 DB가 업데이트된다.
    public void updateCheckedAt(LocalDateTime now) {
        this.checkedAt = now;
    }
    public void updateMemo(String memo) {
        this.memo = memo;
    }
    public void updateScreenshotPath(String screenshotPath) {
        this.screenshotPath = screenshotPath;
    }

    // 생성 편의를 위한 정적 팩토리 메서드
    public static EventLogEntity create(CamEntity camEntity, String eventType, String screenshotPath) {
        EventLogEntity entity = new EventLogEntity();
        entity.camEntity = camEntity;
        entity.eventType = eventType;
        entity.screenshotPath = screenshotPath;
        // memo, checkedAt 은 기본 null, createdAt 은 @CreationTimestamp 로 자동 설정
        return entity;
    }
}

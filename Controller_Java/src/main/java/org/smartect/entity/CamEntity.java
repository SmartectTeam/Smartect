package org.smartect.entity;

import jakarta.persistence.*;
import lombok.Getter;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;

@Entity
@Getter
@Table(name="Cam")
public class CamEntity {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long camNo;

    @Column(name="location")
    private String location;

    @Column(name="name")
    private String name;

    @Column(name="status")
    private Status status;

    @CreationTimestamp // DB에 처음 저장될 때 자동
    @Column(name="created_at", updatable = false) // 수정 X
    private LocalDateTime createdAt;

    @Column(name="detect_boxes")
    private String detectBoxes; // 접근금지영역 좌표 (json)
//    private LocalDateTime updatedAt; 기록 안함~
    // 접근 금지 영역 좌표 변경시 업데이트 타임 기록할거삼?

    public enum Status{
        ONLINE,OFFLINE
    }
}

package org.smartect.entity;

import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;
import org.smartect.common.enums.CamStatus;
import org.springframework.format.annotation.DateTimeFormat;

import java.time.LocalDateTime;

@Entity
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@Table(name="cam")
public class CamEntity {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name="cam_no")
    private Long camNo;

    @Column(name="location",length = 100,nullable = false)
    private String location;

    @Column(name="name",length = 50,nullable = false)
    private String name;

    @Enumerated(EnumType.STRING)
    @Column(name="status",nullable = false,length = 20)
    private CamStatus status = CamStatus.ONLINE;
    // ONLINE,OFFLINE  DEFAULT = ONLINE

    @CreationTimestamp // DB에 처음 저장될 때 자동
    @Column(name="created_at", updatable = false,nullable = false) // 수정 X
    private LocalDateTime createdAt;

    @Lob // DB : TEXT
    @Column(name="detect_boxes")
    private String detectBoxes; // 접근금지영역 좌표 (json)

//    private LocalDateTime updatedAt; 기록 안함~
    // 접근 금지 영역 좌표 변경시 업데이트 타임 기록할거삼?

// org.smartect.common.enums 로 이동
//    public enum Status{
//        ONLINE,OFFLINE
//    }
}

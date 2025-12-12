package org.smartect.entity;

import jakarta.persistence.*;
import lombok.Getter;

import java.time.LocalDateTime;

@Entity
@Getter
@Table(name="event_log")
public class EventLogEntity {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long eventNo;

    @Column(name="cam_no")
    private int camNo;

    @Column(name="event_type")
    private String eventType;
//
//    @Column(name="danger_level")
//    private Integer dangerLevel; // 위험도 0~3?
    @Column(name="screenshot_path")
    private String screenshotPath; // Python에서 저장, 경로만 넘어옴

    @Column(name="memo")
    private String memo;

    @Column(name="created_at")
    private LocalDateTime createdAt;

    @Column(name="checked_at")
    private LocalDateTime checkedAt;



}

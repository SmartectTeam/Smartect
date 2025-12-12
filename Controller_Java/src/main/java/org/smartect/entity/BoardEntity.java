package org.smartect.entity;

import jakarta.persistence.*;
import lombok.Getter;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;

@Entity
@Getter
@Table(name="board")
public class BoardEntity {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long boardNo;

    @Column(name="writer_info")
    private String writerInfo;

    @Column(name="title")
    private String title;

    @Column(name="content")
    private String content;

    @CreationTimestamp // DB에 처음 저장될 때 자동
    @Column(name="created_at", updatable=false) // 수정 X
    private LocalDateTime createdAt;

    @Column(name="updated_at")
    private String updatedAt;


}

package org.smartect.entity;

import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;

@Entity
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@Table(name="board")
public class BoardEntity {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name="board_no")
    private Long boardNo;

    @Column(name="writer_info",length = 100)
    private String writerInfo;

    @Column(name="title",nullable = false,length = 100)
    private String title;

    @Lob // TEXT
    @Column(name="content",nullable = false,columnDefinition = "TEXT")
    private String content;

    @CreationTimestamp // DB에 처음 저장될 때 자동
    @Column(name="created_at", updatable=false,nullable = false) // 수정 X
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name="updated_at")
    private LocalDateTime updatedAt;


}

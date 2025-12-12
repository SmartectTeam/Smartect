package org.smartect.entity;

import jakarta.persistence.*;
import lombok.Getter;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;

@Getter
@Entity
@Table(name="user")
public class UserEntity {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long userNo; // Autoincrement

    @Column(name="user_id")
    private String userId; // 아이디

    @Column(name="password")
    private String password;

    @Column(name="name")
    private String name;

    @Column(name="role")
    private UserRole role;

    @Column(name="status")
    private Status status;

    @CreationTimestamp// DB에 처음 저장될 때 자동으로
    @Column(name="created_at", updatable = false) // 수정 X
    private LocalDateTime createdAt;

    @Column(name="lastLogin")
    private LocalDateTime last_login;

    public enum UserRole{
        ADMIN,STAFF
    }
    public enum Status{
        ACTIVE,INACTIVE,WITHDRAWAL
    }
}

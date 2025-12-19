package org.smartect.entity;

import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;
import org.smartect.common.enums.UserRole;
import org.smartect.common.enums.UserStatus;

import java.time.LocalDateTime;

@Getter
@Entity
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@Table(name="users")
public class UserEntity {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name="user_no")
    private Long userNo; // Autoincrement

    @Column(name="user_id",length = 50,nullable = false,unique = true)
    private String userId; // 아이디

    @Column(name="password",nullable = false,length = 255)
    private String password;

    @Column(name="name",nullable = false,length = 50)
    private String name;

    @Enumerated(EnumType.STRING) // 'ADMIN','STAFF'
    @Column(name="role",nullable = false,length = 20)
    private UserRole role = UserRole.STAFF; // DEFAULT = STAFF

    @Enumerated(EnumType.STRING) // 'ACTIVE','INACTIVE','WITHDRAWAL'
    @Column(name="status",nullable = false,length = 20)
    private UserStatus status = UserStatus.ACTIVE; //DEFAULT = ACTIVE

    @CreationTimestamp// DB에 처음 저장될 때 자동으로
    @Column(name="created_at", updatable = false,nullable = false) // 수정 X
    private LocalDateTime createdAt;

    @Column(name="last_login")
    private LocalDateTime lastLogin;

    @Builder
    public UserEntity(String userId,
                      String password,
                      String name,
                      UserRole role,
                      UserStatus status) {
        this.userId = userId;
        this.password = password;
        this.name = name;
        this.role = role;
        this.status = status;
    }



// org.smartect.common.enums 로 이동
//    public enum UserRole{
//        ADMIN,STAFF
//    }
//    public enum Status{
//        ACTIVE,INACTIVE,WITHDRAWAL
//    }
}

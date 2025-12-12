package org.smartect.dto;

import lombok.*;
import org.smartect.entity.UserEntity;

import java.time.LocalDateTime;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class UserDTO {
    private Long userNo; // Autoincrement
    private String userId; // 아이디
    private String password;
    private String name;
    private UserEntity.UserRole role; // enum{ADMIN,STAFF}
    private UserEntity.Status status; // enum{ACTIVE,INACTIVE,WITHDRAWAL}
    private LocalDateTime createdAt;
    private LocalDateTime last_login;
}

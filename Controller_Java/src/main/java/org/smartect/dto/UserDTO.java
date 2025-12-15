package org.smartect.dto;

import lombok.*;
import org.smartect.common.enums.UserRole;
import org.smartect.common.enums.UserStatus;
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
    private UserRole role; // enum{ADMIN,STAFF}
    private UserStatus status; // enum{ACTIVE,INACTIVE,WITHDRAWAL}
    private LocalDateTime createdAt;
    private LocalDateTime last_login;
}

package org.smartect.controller;

import org.apache.catalina.User;
import org.junit.jupiter.api.Test;
import org.smartect.common.enums.UserRole;
import org.smartect.common.enums.UserStatus;
import org.smartect.entity.UserEntity;
import org.smartect.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.test.annotation.Rollback;

@SpringBootTest
class ControllerApplicationTests {
    @Autowired
    BCryptPasswordEncoder encoder;
    @Autowired
    UserRepository userRepository;

    @Test
    void contextLoads() {
    }

    @Test
    @Rollback(value = false)
    void addAdminUser() {
        UserEntity entity = UserEntity.builder()
                .userId("admin1")
                .password(encoder.encode("1234"))
                .name("관리자")
                .role(UserRole.ADMIN)
                .status(UserStatus.ACTIVE)
                .build();
        userRepository.save(entity);

    }

}

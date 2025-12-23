//package org.smartect;
//
//import org.springframework.boot.SpringApplication;
//import org.springframework.boot.autoconfigure.SpringBootApplication;
//import org.springframework.boot.autoconfigure.jdbc.DataSourceAutoConfiguration;
//import org.springframework.scheduling.annotation.EnableAsync;
//
//@EnableAsync
//@SpringBootApplication //(exclude = {DataSourceAutoConfiguration.class})
//public class ControllerApplication {
//
//	public static void main(String[] args) {
//        SpringApplication.run(ControllerApplication.class, args);
//	}
//
//
//}

package org.smartect;

import org.smartect.controller.HomeController; // 경로 확인 필요
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.autoconfigure.jdbc.DataSourceAutoConfiguration;
import org.springframework.boot.autoconfigure.orm.jpa.HibernateJpaAutoConfiguration;
import org.springframework.boot.autoconfigure.security.servlet.SecurityAutoConfiguration;
import org.springframework.context.annotation.ComponentScan;
import org.springframework.context.annotation.FilterType;

// 1. DB, JPA, 보안 설정 끄기
@SpringBootApplication(exclude = {
		DataSourceAutoConfiguration.class,
		HibernateJpaAutoConfiguration.class,
		SecurityAutoConfiguration.class
})
// 2. 중요: "내 눈에는 HomeController 하나만 보인다" 설정 (다른 컨트롤러/서비스 싹 다 무시)
@ComponentScan(
		basePackages = "org.smartect",
		useDefaultFilters = false, // 자동 스캔 끄기
		includeFilters = @ComponentScan.Filter(
				type = FilterType.ASSIGNABLE_TYPE,
				classes = {HomeController.class} // 오직 이 파일만 로드함
		)
)
public class ControllerApplication {
	public static void main(String[] args) {
		SpringApplication.run(ControllerApplication.class, args);
	}
}
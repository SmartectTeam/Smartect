package org.smartect;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.autoconfigure.jdbc.DataSourceAutoConfiguration;

@SpringBootApplication //(exclude = {DataSourceAutoConfiguration.class})
public class ControllerApplication {

	public static void main(String[] args) {
        SpringApplication.run(ControllerApplication.class, args);
	}


}
package org.smartect;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.autoconfigure.jdbc.DataSourceAutoConfiguration;
import org.springframework.context.annotation.Bean;
import org.springframework.web.reactive.function.client.WebClient;

@SpringBootApplication(exclude = {DataSourceAutoConfiguration.class})
public class ControllerApplication {

	public static void main(String[] args) {
        SpringApplication.run(ControllerApplication.class, args);
	}

    @Bean
    public WebClient webClient() {
        return WebClient.create();
    }

}
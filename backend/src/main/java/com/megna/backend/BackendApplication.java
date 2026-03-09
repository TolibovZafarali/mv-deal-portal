package com.megna.backend;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableScheduling
public class BackendApplication {
	// No-op touchpoint for backend redeploy verification.

	public static void main(String[] args) {
		SpringApplication.run(BackendApplication.class, args);
	}

}

package com.megna.backend.security;

import com.megna.backend.entities.Admin;
import com.megna.backend.repositories.AdminRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class AdminBootstrapRunner implements ApplicationRunner {

    private final AdminRepository adminRepository;
    private final PasswordEncoder passwordEncoder;

    @Value("${app.admin.bootstrap.email:}")
    private String email;

    @Value("${app.admin.bootstrap.password:}")
    private String password;

    @Override
    public void run(ApplicationArguments args) {
        if (email == null || email.isBlank() || password == null || password.isBlank()) {
            return; // nothing to do
        }

        String normalizedEmail = email.trim().toLowerCase();

        if (adminRepository.existsByEmail(normalizedEmail)) {
            return; // already created
        }

        Admin admin = Admin.builder()
                .email(normalizedEmail)
                .passwordHash(passwordEncoder.encode(password))
                .build();

        adminRepository.save(admin);
    }
}

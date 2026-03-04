package com.megna.backend.domain.repository;

import com.megna.backend.domain.entity.EmailSuppression;
import org.springframework.data.jpa.repository.JpaRepository;

public interface EmailSuppressionRepository extends JpaRepository<EmailSuppression, String> {
    boolean existsByEmail(String email);
}

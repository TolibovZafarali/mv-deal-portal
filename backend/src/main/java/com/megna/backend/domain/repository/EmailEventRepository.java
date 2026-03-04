package com.megna.backend.domain.repository;

import com.megna.backend.domain.entity.EmailEvent;
import org.springframework.data.jpa.repository.JpaRepository;

public interface EmailEventRepository extends JpaRepository<EmailEvent, Long> {
}

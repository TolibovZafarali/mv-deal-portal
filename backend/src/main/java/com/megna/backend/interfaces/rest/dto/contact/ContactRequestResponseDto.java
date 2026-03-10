package com.megna.backend.interfaces.rest.dto.contact;

import com.megna.backend.domain.enums.ContactRequestCategory;
import com.megna.backend.domain.enums.ContactRequestStatus;
import com.megna.backend.domain.enums.EmailStatus;

import java.time.LocalDateTime;

public record ContactRequestResponseDto(
        Long id,
        ContactRequestCategory category,
        String name,
        String email,
        String messageBody,
        ContactRequestStatus status,
        EmailStatus adminEmailStatus,
        EmailStatus confirmationEmailStatus,
        LocalDateTime createdAt
) {
}

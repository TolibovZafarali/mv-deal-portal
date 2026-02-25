package com.megna.backend.interfaces.rest.dto.inquiry;

import com.megna.backend.domain.enums.EmailStatus;

import java.time.LocalDateTime;

public record InquiryResponseDto(
        Long id,
        Long propertyId,
        Long investorId,
        String subject,
        String messageBody,
        String contactName,
        String companyName,
        String contactEmail,
        String contactPhone,
        EmailStatus emailStatus,
        LocalDateTime createdAt
) {
}

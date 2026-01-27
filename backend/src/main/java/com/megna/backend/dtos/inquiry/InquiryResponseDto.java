package com.megna.backend.dtos.inquiry;

import com.megna.backend.enums.EmailStatus;

import java.time.LocalDateTime;

public record InquiryResponseDto(
        Long id,
        Long propertyId,
        Long investorId,
        String subject,
        String messageBody,
        String contactName,
        String contactEmail,
        String contactPhone,
        EmailStatus emailStatus,
        LocalDateTime createdAt
) {
}

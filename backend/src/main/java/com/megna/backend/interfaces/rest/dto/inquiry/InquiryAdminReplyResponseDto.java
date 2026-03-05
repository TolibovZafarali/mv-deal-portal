package com.megna.backend.interfaces.rest.dto.inquiry;

import com.megna.backend.domain.enums.EmailStatus;

import java.time.LocalDateTime;

public record InquiryAdminReplyResponseDto(
        Long id,
        Long investorId,
        Long propertyId,
        String body,
        EmailStatus emailStatus,
        LocalDateTime createdAt
) {
}

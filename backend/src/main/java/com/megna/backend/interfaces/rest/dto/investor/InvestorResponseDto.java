package com.megna.backend.interfaces.rest.dto.investor;

import com.megna.backend.domain.enums.InvestorStatus;

import java.time.LocalDateTime;

public record InvestorResponseDto(
        Long id,
        String firstName,
        String lastName,
        String companyName,
        String email,
        String notificationEmail,
        String phone,
        InvestorStatus status,
        String rejectionReason,
        LocalDateTime approvedAt,
        LocalDateTime createdAt,
        LocalDateTime updatedAt
) {
}

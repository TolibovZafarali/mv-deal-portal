package com.megna.backend.dtos.investor;

import com.megna.backend.enums.InvestorStatus;

import java.time.LocalDateTime;

public record InvestorResponseDto(
        Long id,
        String firstName,
        String lastName,
        String companyName,
        String email,
        String phone,
        InvestorStatus status,
        String rejectionReason,
        LocalDateTime approvedAt,
        LocalDateTime createdAt,
        LocalDateTime updatedAt
) {
}

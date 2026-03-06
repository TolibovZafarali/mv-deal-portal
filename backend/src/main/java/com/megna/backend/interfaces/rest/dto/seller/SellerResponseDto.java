package com.megna.backend.interfaces.rest.dto.seller;

import com.megna.backend.domain.enums.SellerStatus;

import java.time.LocalDateTime;

public record SellerResponseDto(
        Long id,
        String firstName,
        String lastName,
        String companyName,
        String email,
        String notificationEmail,
        String phone,
        SellerStatus status,
        LocalDateTime createdAt,
        LocalDateTime updatedAt
) {
}

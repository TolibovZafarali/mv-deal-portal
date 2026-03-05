package com.megna.backend.interfaces.rest.dto.seller;

import com.megna.backend.domain.enums.SellerThreadStatus;

import java.time.LocalDateTime;

public record SellerThreadDto(
        Long id,
        Long propertyId,
        Long sellerId,
        SellerThreadStatus status,
        String topicType,
        Long topicRefId,
        LocalDateTime lastMessageAt,
        String lastMessagePreview,
        long unreadCount,
        LocalDateTime createdAt,
        LocalDateTime updatedAt
) {
}

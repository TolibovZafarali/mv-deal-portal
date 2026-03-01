package com.megna.backend.interfaces.rest.dto.property;

import com.megna.backend.domain.enums.PropertyChangeRequestStatus;

import java.time.LocalDateTime;

public record PropertyChangeRequestResponseDto(
        Long id,
        Long propertyId,
        Long sellerId,
        String requestedChanges,
        PropertyChangeRequestStatus status,
        String adminNote,
        Long resolvedByAdminId,
        LocalDateTime createdAt,
        LocalDateTime updatedAt,
        LocalDateTime resolvedAt
) {
}

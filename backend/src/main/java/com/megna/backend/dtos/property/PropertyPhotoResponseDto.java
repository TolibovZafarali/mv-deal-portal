package com.megna.backend.dtos.property;

import java.time.LocalDateTime;

public record PropertyPhotoResponseDto(
        Long id,
        Long propertyId,
        String url,
        int sortOrder,
        String caption,
        LocalDateTime createdAt
) {
}

package com.megna.backend.interfaces.rest.dto.property;

import java.time.LocalDateTime;

public record PropertyPhotoResponseDto(
        Long id,
        Long propertyId,
        String photoAssetId,
        String url,
        String thumbnailUrl,
        int sortOrder,
        String caption,
        LocalDateTime createdAt
) {
}

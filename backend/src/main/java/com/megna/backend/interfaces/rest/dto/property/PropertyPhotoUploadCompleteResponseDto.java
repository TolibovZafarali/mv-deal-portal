package com.megna.backend.interfaces.rest.dto.property;

public record PropertyPhotoUploadCompleteResponseDto(
        String photoAssetId,
        String url,
        String thumbnailUrl,
        Integer width,
        Integer height,
        String contentType,
        Long sizeBytes,
        String status,
        String errorMessage
) {
}

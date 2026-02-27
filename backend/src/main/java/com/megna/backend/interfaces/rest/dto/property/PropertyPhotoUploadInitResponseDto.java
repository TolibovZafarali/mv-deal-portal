package com.megna.backend.interfaces.rest.dto.property;

import java.time.LocalDateTime;
import java.util.Map;

public record PropertyPhotoUploadInitResponseDto(
        String uploadId,
        String uploadUrl,
        String httpMethod,
        Map<String, String> requiredHeaders,
        LocalDateTime expiresAt,
        String uploadToken
) {
}

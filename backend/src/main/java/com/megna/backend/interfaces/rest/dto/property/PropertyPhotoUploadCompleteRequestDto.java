package com.megna.backend.interfaces.rest.dto.property;

import jakarta.validation.constraints.NotBlank;

public record PropertyPhotoUploadCompleteRequestDto(
        @NotBlank String uploadToken
) {
}

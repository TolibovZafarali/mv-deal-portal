package com.megna.backend.interfaces.rest.dto.property;

import jakarta.validation.constraints.NotBlank;

public record PropertyPhotoUrlCreateRequestDto(
        @NotBlank String url
) {
}

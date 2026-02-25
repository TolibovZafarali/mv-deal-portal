package com.megna.backend.interfaces.rest.dto.property;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record PropertyPhotoRequestDto(
        @NotBlank String url,
        Integer sortOrder,
        @Size(max = 120) String caption
) {
}

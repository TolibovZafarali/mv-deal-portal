package com.megna.backend.interfaces.rest.dto.property;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record PropertyPhotoRequestDto(
        @NotBlank @Size(max = 36) String photoAssetId,
        Integer sortOrder,
        @Size(max = 120) String caption
) {
}

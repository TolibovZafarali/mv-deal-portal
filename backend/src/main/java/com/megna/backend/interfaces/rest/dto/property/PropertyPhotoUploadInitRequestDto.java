package com.megna.backend.interfaces.rest.dto.property;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record PropertyPhotoUploadInitRequestDto(
        @NotBlank @Size(max = 255) String fileName,
        @NotBlank @Size(max = 100) String contentType,
        @NotNull @Min(1) Long sizeBytes
) {
}

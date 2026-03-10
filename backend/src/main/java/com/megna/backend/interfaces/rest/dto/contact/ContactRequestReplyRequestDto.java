package com.megna.backend.interfaces.rest.dto.contact;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record ContactRequestReplyRequestDto(
        @NotBlank
        @Size(max = 5000)
        String message
) {
}

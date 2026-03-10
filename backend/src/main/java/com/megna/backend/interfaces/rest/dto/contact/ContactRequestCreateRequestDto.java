package com.megna.backend.interfaces.rest.dto.contact;

import com.megna.backend.domain.enums.ContactRequestCategory;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record ContactRequestCreateRequestDto(
        @NotNull ContactRequestCategory category,
        @NotBlank @Size(max = 160) String name,
        @NotBlank @Email @Size(max = 255) String email,
        @NotBlank @Size(max = 5000) String message
) {
}

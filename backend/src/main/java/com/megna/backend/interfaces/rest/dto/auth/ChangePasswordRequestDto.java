package com.megna.backend.interfaces.rest.dto.auth;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record ChangePasswordRequestDto(
        @NotBlank @Size(min = 8, max = 255) String currentPassword,
        @NotBlank @Size(min = 8, max = 255) String newPassword
) {
}

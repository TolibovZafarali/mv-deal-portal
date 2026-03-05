package com.megna.backend.interfaces.rest.dto.auth;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record ResetPasswordRequestDto(
        @NotBlank @Size(max = 255) String token,
        @NotBlank @Size(min = 8, max = 255) String newPassword
) {
}

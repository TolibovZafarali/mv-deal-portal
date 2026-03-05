package com.megna.backend.interfaces.rest.dto.auth;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record ForgotPasswordRequestDto(
        @NotBlank @Email @Size(max = 255) String email
) {
}

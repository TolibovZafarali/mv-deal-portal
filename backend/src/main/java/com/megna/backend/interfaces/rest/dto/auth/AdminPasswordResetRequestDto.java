package com.megna.backend.interfaces.rest.dto.auth;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record AdminPasswordResetRequestDto(
        @NotBlank @Email @Size(max = 255) String email,
        @NotBlank @Pattern(regexp = "[0-9]{6}", message = "Passcode must be 6 digits") String passcode,
        @NotBlank @Size(min = 8, max = 255) String newPassword
) {
}

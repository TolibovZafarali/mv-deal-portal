package com.megna.backend.interfaces.rest.dto.admin;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record AdminCredentialsUpdateRequestDto(
        @NotBlank @Email @Size(max = 255) String email,
        @NotBlank @Size(min = 8, max = 255) String currentPassword,
        @Size(min = 8, max = 255) String newPassword
) {
}

package com.megna.backend.interfaces.rest.dto.admin;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;

public record AdminTestEmailRequestDto(
        @NotBlank @Email String to
) {
}

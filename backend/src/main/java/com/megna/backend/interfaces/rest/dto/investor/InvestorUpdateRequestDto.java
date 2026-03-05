package com.megna.backend.interfaces.rest.dto.investor;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record InvestorUpdateRequestDto(
        @NotBlank @Size(max = 120) String companyName,
        @NotBlank @Size(max = 30) String phone,
        @Email @Size(max = 255) String notificationEmail
) {
}

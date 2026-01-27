package com.megna.backend.dtos.investor;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record InvestorCreateRequestDto(
        @NotBlank @Size(max = 80) String firstName,
        @NotBlank @Size(max = 80) String lastName,
        @NotBlank @Size(max = 120) String companyName,
        @NotBlank @Email @Size(max = 255) String email,
        @NotBlank @Size(max = 30) String phone,
        @NotBlank @Size(min = 8, max = 255) String password
) {
}

package com.megna.backend.dtos.investor;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record InvestorUpdateRequestDto(
        @NotBlank @Size(max = 120) String companyName,
        @NotBlank @Size(max = 30) String phone
) {
}

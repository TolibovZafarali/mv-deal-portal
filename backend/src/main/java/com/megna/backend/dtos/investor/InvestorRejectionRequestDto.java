package com.megna.backend.dtos.investor;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record InvestorRejectionRequestDto(
        @NotBlank @Size(max = 500) String rejectionReason
) {
}

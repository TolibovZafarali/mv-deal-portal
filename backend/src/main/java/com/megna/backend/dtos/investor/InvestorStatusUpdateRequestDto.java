package com.megna.backend.dtos.investor;

import com.megna.backend.enums.InvestorStatus;
import jakarta.validation.constraints.NotNull;

public record InvestorStatusUpdateRequestDto(
        @NotNull InvestorStatus status
        ) {
}

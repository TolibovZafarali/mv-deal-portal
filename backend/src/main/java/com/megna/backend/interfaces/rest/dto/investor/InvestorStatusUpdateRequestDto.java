package com.megna.backend.interfaces.rest.dto.investor;

import com.megna.backend.domain.enums.InvestorStatus;
import jakarta.validation.constraints.NotNull;

public record InvestorStatusUpdateRequestDto(
        @NotNull InvestorStatus status
        ) {
}

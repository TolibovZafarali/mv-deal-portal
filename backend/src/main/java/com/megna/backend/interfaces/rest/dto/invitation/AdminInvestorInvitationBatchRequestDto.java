package com.megna.backend.interfaces.rest.dto.invitation;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.Size;

import java.util.List;

public record AdminInvestorInvitationBatchRequestDto(
        @NotEmpty @Size(max = 50) List<@Valid InvestorInvitationRequestDto> invitations
) {
}

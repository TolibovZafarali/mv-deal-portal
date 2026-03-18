package com.megna.backend.interfaces.rest.dto.invitation;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record InvestorInvitationAcceptRequestDto(
        @Size(max = 120) String companyName,
        @NotBlank @Size(max = 30) String phone,
        @NotBlank @Size(min = 8, max = 255) String password
) {
}

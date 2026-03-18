package com.megna.backend.interfaces.rest.dto.invitation;

public record InvestorInvitationSendResultDto(
        String firstName,
        String lastName,
        String email,
        InvestorInvitationSendResultStatus status,
        String message
) {
}

package com.megna.backend.interfaces.rest.dto.invitation;

import java.time.LocalDateTime;

public record InvestorInvitationPreviewDto(
        String firstName,
        String lastName,
        String email,
        LocalDateTime expiresAt
) {
}

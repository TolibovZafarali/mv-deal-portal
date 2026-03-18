package com.megna.backend.interfaces.rest.dto.invitation;

public enum InvestorInvitationSendResultStatus {
    SENT,
    RESENT,
    SKIPPED_EXISTING_ACCOUNT,
    SKIPPED_DUPLICATE_IN_REQUEST,
    FAILED
}

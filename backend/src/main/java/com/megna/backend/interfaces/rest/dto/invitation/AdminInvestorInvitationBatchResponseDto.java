package com.megna.backend.interfaces.rest.dto.invitation;

import java.util.List;

public record AdminInvestorInvitationBatchResponseDto(
        int requestedCount,
        int sentCount,
        int resentCount,
        int skippedExistingAccountCount,
        int skippedDuplicateCount,
        int failedCount,
        List<InvestorInvitationSendResultDto> results
) {
}

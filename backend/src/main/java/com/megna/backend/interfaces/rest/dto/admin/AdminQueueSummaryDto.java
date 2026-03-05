package com.megna.backend.interfaces.rest.dto.admin;

public record AdminQueueSummaryDto(
        long draftProperties,
        long submittedProperties,
        long pendingInvestors,
        long failedInquiries
) {
}

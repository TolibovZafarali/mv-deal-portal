package com.megna.backend.interfaces.rest.dto.admin;

public record AdminQueueSummaryDto(
        long submittedProperties,
        long openChangeRequests,
        long pendingInvestors,
        long failedInquiries
) {
}

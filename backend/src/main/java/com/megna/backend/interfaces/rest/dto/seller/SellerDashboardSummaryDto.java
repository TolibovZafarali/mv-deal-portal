package com.megna.backend.interfaces.rest.dto.seller;

public record SellerDashboardSummaryDto(
        long drafts,
        long submitted,
        long changesRequested,
        long published
) {
}

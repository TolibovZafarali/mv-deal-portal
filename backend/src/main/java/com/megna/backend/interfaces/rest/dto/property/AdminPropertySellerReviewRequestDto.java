package com.megna.backend.interfaces.rest.dto.property;

import jakarta.validation.constraints.NotNull;

public record AdminPropertySellerReviewRequestDto(
        @NotNull AdminPropertySellerReviewAction action,
        String reviewNote
) {
}

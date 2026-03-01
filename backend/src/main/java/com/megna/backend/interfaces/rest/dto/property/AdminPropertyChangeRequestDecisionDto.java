package com.megna.backend.interfaces.rest.dto.property;

import jakarta.validation.constraints.NotNull;

public record AdminPropertyChangeRequestDecisionDto(
        @NotNull AdminPropertyChangeRequestDecisionAction action,
        String adminNote
) {
}

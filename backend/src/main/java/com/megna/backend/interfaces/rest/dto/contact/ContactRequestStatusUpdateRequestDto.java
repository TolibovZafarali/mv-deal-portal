package com.megna.backend.interfaces.rest.dto.contact;

import com.megna.backend.domain.enums.ContactRequestStatus;
import jakarta.validation.constraints.NotNull;

public record ContactRequestStatusUpdateRequestDto(
        @NotNull ContactRequestStatus status
) {
}

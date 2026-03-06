package com.megna.backend.interfaces.rest.dto.admin;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record AdminInquiryReplyCreateRequestDto(
        @NotNull Long investorId,
        @NotNull Long propertyId,
        @NotBlank @Size(max = 5000) String body
) {
}

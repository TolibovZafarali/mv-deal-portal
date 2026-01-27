package com.megna.backend.dtos.inquiry;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record InquiryCreateRequestDto(
        @NotNull Long propertyId,
        @NotNull Long investorId,
        @Size(max = 120) String subject,
        @NotBlank String messageBody,
        @NotBlank @Size(max = 160) String contactName,
        @NotBlank @Email @Size(max = 255) String contactEmail,
        @NotBlank @Size(max = 30) String contactPhone
) {
}

package com.megna.backend.interfaces.rest.dto.seller;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record SellerUpdateRequestDto(
        @NotBlank @Size(max = 120) String companyName,
        @NotBlank @Size(max = 30) String phone
) {
}

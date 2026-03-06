package com.megna.backend.interfaces.rest.dto.seller;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record SellerThreadCreateMessageRequestDto(
        @NotBlank @Size(max = 5000) String body
) {
}

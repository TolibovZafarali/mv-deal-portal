package com.megna.backend.dtos.property;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;
import java.time.LocalDate;

public record PropertySaleCompRequestDto(
        @NotBlank @Size(max = 200) String address,
        BigDecimal soldPrice,
        LocalDate soldDate,
        Integer beds,
        BigDecimal baths,
        Integer livingAreaSqft,
        BigDecimal distanceMiles,
        @Size(max = 255) String notes,
        Integer sortOrder
) {
}

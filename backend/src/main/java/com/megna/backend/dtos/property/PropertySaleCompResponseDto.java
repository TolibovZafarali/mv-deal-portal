package com.megna.backend.dtos.property;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

public record PropertySaleCompResponseDto(
        Long id,
        Long propertyId,
        String address,
        BigDecimal soldPrice,
        LocalDate soldDate,
        Integer beds,
        BigDecimal baths,
        Integer livingAreaSqft,
        BigDecimal distanceMiles,
        String notes,
        int sortOrder,
        LocalDateTime createdAt
) {
}

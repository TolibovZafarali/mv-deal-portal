package com.megna.backend.dtos.property;

import com.megna.backend.enums.ClosingTerms;
import com.megna.backend.enums.ExitStrategy;
import com.megna.backend.enums.OccupancyStatus;
import com.megna.backend.enums.PropertyStatus;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

public record PropertyResponseDto(
        Long id,
        PropertyStatus status,
        String title,

        String street1,
        String street2,
        String city,
        String state,
        String zip,

        BigDecimal askingPrice,
        BigDecimal arv,
        BigDecimal estRepairs,

        Integer beds,
        BigDecimal baths,
        Integer livingAreaSqft,
        Integer yearBuilt,
        Integer roofAge,
        Integer hvac,

        OccupancyStatus occupancyStatus,
        ExitStrategy exitStrategy,
        ClosingTerms closingTerms,
        String description,

        LocalDateTime createdAt,
        LocalDateTime updatedAt,

        List<PropertyPhotoResponseDto> photos,
        List<PropertySaleCompResponseDto> saleComps
) {
}

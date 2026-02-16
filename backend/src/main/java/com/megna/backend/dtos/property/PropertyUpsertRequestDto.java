package com.megna.backend.dtos.property;

import com.megna.backend.enums.ClosingTerms;
import com.megna.backend.enums.ExitStrategy;
import com.megna.backend.enums.OccupancyStatus;
import com.megna.backend.enums.PropertyStatus;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;
import java.util.List;

public record PropertyUpsertRequestDto(
        @NotNull PropertyStatus status,
        @NotBlank @Size(max = 120) String title,

        @Size(max = 120) String street1,
        @Size(max = 120) String street2,
        @Size(max = 80) String city,
        @Size(max = 40) String state,
        @Size(max = 15) String zip,

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

        @Valid List<PropertyPhotoRequestDto> photos,
        @Valid List<PropertySaleCompRequestDto> saleComps
        ) {
}

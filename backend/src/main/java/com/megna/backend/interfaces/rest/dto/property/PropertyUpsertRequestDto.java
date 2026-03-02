package com.megna.backend.interfaces.rest.dto.property;

import com.megna.backend.domain.enums.ClosingTerms;
import com.megna.backend.domain.enums.ExitStrategy;
import com.megna.backend.domain.enums.OccupancyStatus;
import com.megna.backend.domain.enums.PropertyStatus;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;
import java.util.List;

public record PropertyUpsertRequestDto(
        @NotNull PropertyStatus status,
        @NotBlank @Size(max = 120) String title,

        @NotBlank @Size(max = 120) String street1,
        @Size(max = 120) String street2,
        @NotBlank @Size(max = 80) String city,
        @NotBlank @Size(max = 40) String state,
        @NotBlank @Size(max = 15) String zip,

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
        BigDecimal currentRent,
        ExitStrategy exitStrategy,
        ClosingTerms closingTerms,

        @Valid List<PropertyPhotoRequestDto> photos,
        @Valid List<PropertySaleCompRequestDto> saleComps
        ) {
}

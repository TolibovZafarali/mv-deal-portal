package com.megna.backend.interfaces.rest.dto.property;

import com.megna.backend.domain.enums.ClosingTerms;
import com.megna.backend.domain.enums.ExitStrategy;
import com.megna.backend.domain.enums.OccupancyStatus;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;
import java.util.List;

public record SellerPropertyDraftUpsertRequestDto(
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
        BigDecimal currentRent,
        ExitStrategy exitStrategy,
        ClosingTerms closingTerms,
        OccupancyStatus occupancyCertificate,

        @Valid List<PropertyPhotoRequestDto> photos,
        @Valid List<PropertySaleCompRequestDto> saleComps
) {
}

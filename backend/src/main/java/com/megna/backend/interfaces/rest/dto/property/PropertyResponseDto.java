package com.megna.backend.interfaces.rest.dto.property;

import com.megna.backend.domain.enums.ClosingTerms;
import com.megna.backend.domain.enums.ExitStrategy;
import com.megna.backend.domain.enums.OccupancyStatus;
import com.megna.backend.domain.enums.PropertyStatus;
import com.megna.backend.domain.enums.SellerWorkflowStatus;

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
        BigDecimal latitude,
        BigDecimal longitude,

        BigDecimal askingPrice,
        BigDecimal arv,
        BigDecimal estRepairs,
        BigDecimal fmr,

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

        Long sellerId,
        SellerWorkflowStatus sellerWorkflowStatus,
        String sellerReviewNote,
        LocalDateTime submittedAt,
        LocalDateTime reviewedAt,
        LocalDateTime publishedAt,

        LocalDateTime createdAt,
        LocalDateTime updatedAt,

        List<PropertyPhotoResponseDto> photos,
        List<PropertySaleCompResponseDto> saleComps
) {
}

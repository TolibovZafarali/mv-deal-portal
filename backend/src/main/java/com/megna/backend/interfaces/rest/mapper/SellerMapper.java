package com.megna.backend.interfaces.rest.mapper;

import com.megna.backend.domain.entity.Seller;
import com.megna.backend.interfaces.rest.dto.seller.SellerResponseDto;
import com.megna.backend.interfaces.rest.dto.seller.SellerUpdateRequestDto;

import java.util.Locale;

public final class SellerMapper {

    private SellerMapper() {}

    public static SellerResponseDto toDto(Seller entity) {
        if (entity == null) return null;

        return new SellerResponseDto(
                entity.getId(),
                entity.getFirstName(),
                entity.getLastName(),
                entity.getCompanyName(),
                entity.getEmail(),
                entity.getNotificationEmail(),
                entity.getPhone(),
                entity.getStatus(),
                entity.getCreatedAt(),
                entity.getUpdatedAt()
        );
    }

    public static void applyUpdate(SellerUpdateRequestDto dto, Seller entity) {
        if (dto == null || entity == null) return;
        entity.setCompanyName(dto.companyName());
        entity.setPhone(dto.phone());
        if (dto.notificationEmail() != null) {
            String normalized = dto.notificationEmail().trim().toLowerCase(Locale.US);
            if (!normalized.isBlank()) {
                entity.setNotificationEmail(normalized);
            }
        }
    }
}

package com.megna.backend.interfaces.rest.mapper;

import com.megna.backend.interfaces.rest.dto.investor.InvestorResponseDto;
import com.megna.backend.interfaces.rest.dto.investor.InvestorStatusUpdateRequestDto;
import com.megna.backend.interfaces.rest.dto.investor.InvestorUpdateRequestDto;
import com.megna.backend.domain.entity.Investor;
import com.megna.backend.domain.enums.InvestorStatus;

import java.util.Locale;
import java.time.LocalDateTime;

public final class InvestorMapper {

    private InvestorMapper() {}

    public static InvestorResponseDto toDto(Investor entity) {
        if (entity == null) return null;

        return new InvestorResponseDto(
                entity.getId(),
                entity.getFirstName(),
                entity.getLastName(),
                entity.getCompanyName(),
                entity.getEmail(),
                entity.getNotificationEmail(),
                entity.getPhone(),
                entity.getStatus(),
                entity.getRejectionReason(),
                entity.getApprovedAt(),
                entity.getCreatedAt(),
                entity.getUpdatedAt()
        );
    }

    public static void applyUpdate(InvestorUpdateRequestDto dto, Investor entity) {
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

//    Updates Investor approval status.
//    If approved, sets approvedAt. Otherwise clears it.

    public static void applyStatusUpdate(InvestorStatusUpdateRequestDto dto, Investor entity) {
        if (dto == null || entity == null) return;

        entity.setStatus(dto.status());
        if (dto.status() == InvestorStatus.APPROVED) {
            entity.setApprovedAt(LocalDateTime.now());
            entity.setRejectionReason(null);
        } else {
            entity.setApprovedAt(null);
        }
    }
}

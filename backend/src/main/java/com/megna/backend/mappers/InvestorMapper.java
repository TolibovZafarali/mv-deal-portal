package com.megna.backend.mappers;

import com.megna.backend.dtos.investor.InvestorResponseDto;
import com.megna.backend.dtos.investor.InvestorStatusUpdateRequestDto;
import com.megna.backend.dtos.investor.InvestorUpdateRequestDto;
import com.megna.backend.entities.Investor;
import com.megna.backend.enums.InvestorStatus;

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
                entity.getPhone(),
                entity.getStatus(),
                entity.getApprovedAt(),
                entity.getCreatedAt(),
                entity.getUpdatedAt()
        );
    }

    public static void applyUpdate(InvestorUpdateRequestDto dto, Investor entity) {
        if (dto == null || entity == null) return;

        entity.setCompanyName(dto.companyName());
        entity.setPhone(dto.phone());
    }

//    Updates Investor approval status.
//    If approved, sets approvedAt. Otherwise clears it.

    public static void applyStatusUpdate(InvestorStatusUpdateRequestDto dto, Investor entity) {
        if (dto == null || entity == null) return;

        entity.setStatus(dto.status());
        if (dto.status() == InvestorStatus.APPROVED) {
            entity.setApprovedAt(LocalDateTime.now());
        } else {
            entity.setApprovedAt(null);
        }
    }
}

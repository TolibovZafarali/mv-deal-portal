package com.megna.backend.interfaces.rest.mapper;

import com.megna.backend.domain.entity.InquiryAdminReply;
import com.megna.backend.interfaces.rest.dto.inquiry.InquiryAdminReplyResponseDto;

public final class InquiryAdminReplyMapper {

    private InquiryAdminReplyMapper() {
    }

    public static InquiryAdminReplyResponseDto toDto(InquiryAdminReply entity) {
        if (entity == null) return null;

        Long investorId = entity.getInvestor() == null ? null : entity.getInvestor().getId();
        Long propertyId = entity.getProperty() == null ? null : entity.getProperty().getId();

        return new InquiryAdminReplyResponseDto(
                entity.getId(),
                investorId,
                propertyId,
                entity.getMessageBody(),
                entity.getEmailStatus(),
                entity.getCreatedAt()
        );
    }
}

package com.megna.backend.mappers;

import com.megna.backend.dtos.inquiry.InquiryCreateRequestDto;
import com.megna.backend.dtos.inquiry.InquiryResponseDto;
import com.megna.backend.entities.Inquiry;
import com.megna.backend.entities.Investor;
import com.megna.backend.entities.Property;

public final class InquiryMapper {

    private InquiryMapper() {}

    public static InquiryResponseDto toDto(Inquiry entity) {
        if (entity == null) return null;

        Long propertyId = entity.getProperty() != null ? entity.getProperty().getId() : null;
        Long investorId = entity.getInvestor() != null ? entity.getInvestor().getId() : null;

        return new InquiryResponseDto(
                entity.getId(),
                propertyId,
                investorId,
                entity.getSubject(),
                entity.getMessageBody(),
                entity.getContactName(),
                entity.getContactEmail(),
                entity.getContactPhone(),
                entity.getEmailStatus(),
                entity.getCreatedAt()
        );
    }

//    Creates an Inquiry entity after the service later has already loaded
//    the referenced Property and Investor.

    public static Inquiry toEntity(InquiryCreateRequestDto dto, Property property, Investor investor) {
        if (dto == null) return null;

        Inquiry inquiry = new Inquiry();
        inquiry.setProperty(property);
        inquiry.setInvestor(investor);
        inquiry.setSubject(dto.subject());
        inquiry.setMessageBody(dto.messageBody());
        inquiry.setContactName(dto.contactName());
        inquiry.setContactEmail(dto.contactEmail());
        inquiry.setContactPhone(dto.contactPhone());
        // emailStatus gets set by email-sending flow later
        return inquiry;
    }
}

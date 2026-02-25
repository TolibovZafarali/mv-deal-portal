package com.megna.backend.interfaces.rest.mapper;

import com.megna.backend.interfaces.rest.dto.inquiry.InquiryCreateRequestDto;
import com.megna.backend.interfaces.rest.dto.inquiry.InquiryResponseDto;
import com.megna.backend.domain.entity.Inquiry;
import com.megna.backend.domain.entity.Investor;
import com.megna.backend.domain.entity.Property;

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
                entity.getCompanyName(),
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
        inquiry.setCompanyName(dto.companyName());
        inquiry.setContactEmail(dto.contactEmail());
        inquiry.setContactPhone(dto.contactPhone());
        // emailStatus gets set by email-sending flow later
        return inquiry;
    }
}

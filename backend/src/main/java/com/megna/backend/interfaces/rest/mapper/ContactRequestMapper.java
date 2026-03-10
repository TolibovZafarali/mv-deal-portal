package com.megna.backend.interfaces.rest.mapper;

import com.megna.backend.domain.entity.ContactRequest;
import com.megna.backend.interfaces.rest.dto.contact.ContactRequestCreateRequestDto;
import com.megna.backend.interfaces.rest.dto.contact.ContactRequestResponseDto;

public final class ContactRequestMapper {

    private ContactRequestMapper() {}

    public static ContactRequestResponseDto toDto(ContactRequest entity) {
        if (entity == null) return null;

        return new ContactRequestResponseDto(
                entity.getId(),
                entity.getCategory(),
                entity.getName(),
                entity.getEmail(),
                entity.getMessageBody(),
                entity.getStatus(),
                entity.getAdminEmailStatus(),
                entity.getConfirmationEmailStatus(),
                entity.getCreatedAt()
        );
    }

    public static ContactRequest toEntity(ContactRequestCreateRequestDto dto) {
        if (dto == null) return null;

        ContactRequest contactRequest = new ContactRequest();
        contactRequest.setCategory(dto.category());
        contactRequest.setName(dto.name());
        contactRequest.setEmail(dto.email());
        contactRequest.setMessageBody(dto.message());
        return contactRequest;
    }
}

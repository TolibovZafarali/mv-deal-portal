package com.megna.backend.interfaces.rest.mapper;

import com.megna.backend.domain.entity.PropertyChangeRequest;
import com.megna.backend.interfaces.rest.dto.property.PropertyChangeRequestResponseDto;

public final class PropertyChangeRequestMapper {

    private PropertyChangeRequestMapper() {}

    public static PropertyChangeRequestResponseDto toDto(PropertyChangeRequest entity) {
        if (entity == null) return null;

        Long propertyId = entity.getProperty() == null ? null : entity.getProperty().getId();
        Long sellerId = entity.getSeller() == null ? null : entity.getSeller().getId();
        Long resolvedByAdminId = entity.getResolvedByAdmin() == null ? null : entity.getResolvedByAdmin().getId();

        return new PropertyChangeRequestResponseDto(
                entity.getId(),
                propertyId,
                sellerId,
                entity.getRequestedChanges(),
                entity.getStatus(),
                entity.getAdminNote(),
                resolvedByAdminId,
                entity.getCreatedAt(),
                entity.getUpdatedAt(),
                entity.getResolvedAt()
        );
    }
}

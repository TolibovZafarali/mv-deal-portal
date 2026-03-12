package com.megna.backend.interfaces.rest.mapper;

import com.megna.backend.interfaces.rest.dto.property.PropertyPhotoRequestDto;
import com.megna.backend.interfaces.rest.dto.property.PropertyPhotoResponseDto;
import com.megna.backend.domain.entity.Property;
import com.megna.backend.domain.entity.PropertyPhoto;

public final class PropertyPhotoMapper {

    private PropertyPhotoMapper() {}

    public static PropertyPhotoResponseDto toDto(PropertyPhoto entity) {
        if (entity == null) return null;

        Long propertyId = entity.getProperty() != null ? entity.getProperty().getId() : null;

        return new PropertyPhotoResponseDto(
                entity.getId(),
                propertyId,
                entity.getPhotoAssetId(),
                entity.getUrl(),
                entity.getThumbnailUrl(),
                entity.getSortOrder(),
                entity.getCaption(),
                entity.getCreatedAt()
        );
    }

    public static PropertyPhoto toEntity(PropertyPhotoRequestDto dto, Property property) {
        if (dto == null) return null;

        PropertyPhoto photo = new PropertyPhoto();
        photo.setProperty(property);
        photo.setPhotoAssetId(dto.photoAssetId());
        // New photos are hydrated with canonical asset URLs later in the service layer.
        // Keep non-null placeholders here to avoid premature JPA auto-flush violating
        // the DB NOT NULL constraint on property_photos.url before hydration runs.
        photo.setUrl("");
        photo.setThumbnailUrl("");
        photo.setSortOrder(dto.sortOrder() != null ? dto.sortOrder() : 0);
        photo.setCaption(dto.caption());
        return photo;
    }
}

package com.megna.backend.mappers;

import com.megna.backend.dtos.property.PropertyPhotoRequestDto;
import com.megna.backend.dtos.property.PropertyPhotoResponseDto;
import com.megna.backend.entities.Property;
import com.megna.backend.entities.PropertyPhoto;

public final class PropertyPhotoMapper {

    private PropertyPhotoMapper() {}

    public static PropertyPhotoResponseDto toDto(PropertyPhoto entity) {
        if (entity == null) return null;

        Long propertyId = entity.getProperty() != null ? entity.getProperty().getId() : null;

        return new PropertyPhotoResponseDto(
                entity.getId(),
                propertyId,
                entity.getUrl(),
                entity.getSortOrder(),
                entity.getCaption(),
                entity.getCreatedAt()
        );
    }

    public static PropertyPhoto toEntity(PropertyPhotoRequestDto dto, Property property) {
        if (dto == null) return null;

        PropertyPhoto photo = new PropertyPhoto();
        photo.setProperty(property);
        photo.setUrl(dto.url());
        photo.setSortOrder(dto.sortOrder() != null ? dto.sortOrder() : 0);
        photo.setCaption(dto.caption());
        return photo;
    }
}

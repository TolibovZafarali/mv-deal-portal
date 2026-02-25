package com.megna.backend.interfaces.rest.mapper;

import com.megna.backend.interfaces.rest.dto.property.PropertySaleCompRequestDto;
import com.megna.backend.interfaces.rest.dto.property.PropertySaleCompResponseDto;
import com.megna.backend.domain.entity.Property;
import com.megna.backend.domain.entity.PropertySaleComp;

public final class PropertySaleCompMapper {

    private PropertySaleCompMapper() {}

    public static PropertySaleCompResponseDto toDto(PropertySaleComp entity) {
        if (entity == null) return null;

        Long propertyId = entity.getProperty() != null ? entity.getProperty().getId() : null;

        return new PropertySaleCompResponseDto(
                entity.getId(),
                propertyId,
                entity.getAddress(),
                entity.getSoldPrice(),
                entity.getSoldDate(),
                entity.getBeds(),
                entity.getBaths(),
                entity.getLivingAreaSqft(),
                entity.getDistanceMiles(),
                entity.getNotes(),
                entity.getSortOrder(),
                entity.getCreatedAt()
        );
    }

    public static PropertySaleComp toEntity(PropertySaleCompRequestDto dto, Property property) {
        if (dto == null) return null;

        PropertySaleComp comp = new PropertySaleComp();
        comp.setProperty(property);
        comp.setAddress(dto.address());
        comp.setSoldPrice(dto.soldPrice());
        comp.setSoldDate(dto.soldDate());
        comp.setBeds(dto.beds());
        comp.setBaths(dto.baths());
        comp.setLivingAreaSqft(dto.livingAreaSqft());
        comp.setDistanceMiles(dto.distanceMiles());
        comp.setNotes(dto.notes());
        comp.setSortOrder(dto.sortOrder() != null ? dto.sortOrder() : 0);
        return comp;
    }
}

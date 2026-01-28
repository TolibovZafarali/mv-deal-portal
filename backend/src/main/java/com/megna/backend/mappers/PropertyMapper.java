package com.megna.backend.mappers;

import com.megna.backend.dtos.property.PropertyPhotoResponseDto;
import com.megna.backend.dtos.property.PropertyResponseDto;
import com.megna.backend.dtos.property.PropertySaleCompResponseDto;
import com.megna.backend.dtos.property.PropertyUpsertRequestDto;
import com.megna.backend.entities.Property;
import com.megna.backend.entities.PropertyPhoto;
import com.megna.backend.entities.PropertySaleComp;

import java.util.ArrayList;
import java.util.List;

public final class PropertyMapper {

    private PropertyMapper() {}

    public static PropertyResponseDto toDto(Property entity) {
        if (entity == null) return null;

        List<PropertyPhotoResponseDto> photosDto = entity.getPhotos() == null
                ? List.of()
                : entity.getPhotos().stream().map(PropertyPhotoMapper::toDto).toList();

        List<PropertySaleCompResponseDto> saleCompsDto = entity.getSaleComps() == null
                ? List.of()
                : entity.getSaleComps().stream().map(PropertySaleCompMapper::toDto).toList();

        return new PropertyResponseDto(
                entity.getId(),
                entity.getStatus(),
                entity.getTitle(),

                entity.getStreet1(),
                entity.getStreet2(),
                entity.getCity(),
                entity.getState(),
                entity.getZip(),

                entity.getAskingPrice(),
                entity.getArv(),
                entity.getEstRepairs(),

                entity.getBeds(),
                entity.getBaths(),
                entity.getLivingAreaSqft(),
                entity.getYearBuilt(),
                entity.getRoofAge(),
                entity.getHvac(),

                entity.getOccupancyStatus(),
                entity.getExitStrategy(),
                entity.getClosingTerms(),
                entity.getDescription(),

                entity.getCreatedAt(),
                entity.getUpdatedAt(),

                photosDto,
                saleCompsDto
        );
    }

    public static Property toEntity(PropertyUpsertRequestDto dto) {
        if (dto == null) return null;

        Property property = new Property();
        applyUpsert(dto, property);
        return property;
    }

    /**
     * Applies an upsert DTO onto an existing entity.
     * <p>
     * Lists behavior:
     * - if dto.photos() == null => leave existing photos as-is
     * - if dto.photos() != null => replace list contents
     * <p>
     * Same for saleComps.
     */

    public static void applyUpsert(PropertyUpsertRequestDto dto, Property entity) {
        if (dto == null || entity == null) return;

        entity.setStatus(dto.status());
        entity.setTitle(dto.title());

        entity.setStreet1(dto.street1());
        entity.setStreet2(dto.street2());
        entity.setCity(dto.city());
        entity.setState(dto.state());
        entity.setZip(dto.zip());

        entity.setAskingPrice(dto.askingPrice());
        entity.setArv(dto.arv());
        entity.setEstRepairs(dto.estRepairs());

        entity.setBeds(dto.beds());
        entity.setBaths(dto.baths());
        entity.setLivingAreaSqft(dto.livingAreaSqft());
        entity.setYearBuilt(dto.yearBuilt());
        entity.setRoofAge(dto.roofAge());
        entity.setHvac(dto.hvac());

        entity.setOccupancyStatus(dto.occupancyStatus());
        entity.setExitStrategy(dto.exitStrategy());
        entity.setClosingTerms(dto.closingTerms());

        entity.setDescription(dto.description());

        if (dto.photos() != null) {
            if (entity.getPhotos() == null) entity.setPhotos(new ArrayList<>());
            else entity.getPhotos().clear();

            for (var photoDto : dto.photos()) {
                PropertyPhoto photo = PropertyPhotoMapper.toEntity(photoDto, entity);
                if (photo != null) entity.getPhotos().add(photo);
            }
        }

        if (dto.saleComps() != null) {
            if (entity.getSaleComps() == null) entity.setSaleComps(new ArrayList<>());
            else entity.getSaleComps().clear();

            for (var compDto : dto.saleComps()) {
                PropertySaleComp comp = PropertySaleCompMapper.toEntity(compDto, entity);
                if (comp != null) entity.getSaleComps().add(comp);
            }
        }
    }
}

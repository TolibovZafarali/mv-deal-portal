package com.megna.backend.interfaces.rest.mapper;

import com.megna.backend.interfaces.rest.dto.property.PropertyPhotoResponseDto;
import com.megna.backend.interfaces.rest.dto.property.PropertyResponseDto;
import com.megna.backend.interfaces.rest.dto.property.PropertySaleCompResponseDto;
import com.megna.backend.interfaces.rest.dto.property.PropertyUpsertRequestDto;
import com.megna.backend.domain.entity.Property;
import com.megna.backend.domain.entity.PropertyPhoto;
import com.megna.backend.domain.entity.PropertySaleComp;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

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
                entity.getStreet1(),
                entity.getStreet2(),
                entity.getCity(),
                entity.getState(),
                entity.getZip(),
                entity.getLatitude(),
                entity.getLongitude(),

                entity.getAskingPrice(),
                entity.getArv(),
                entity.getEstRepairs(),
                entity.getFmr(),

                entity.getBeds(),
                entity.getBaths(),
                entity.getLivingAreaSqft(),
                entity.getYearBuilt(),
                entity.getRoofAge(),
                entity.getHvac(),

                entity.getOccupancyStatus(),
                entity.getCurrentRent(),
                entity.getExitStrategy(),
                entity.getClosingTerms(),
                entity.getOccupancyCertificate(),

                entity.getSeller() == null ? null : entity.getSeller().getId(),
                entity.getSellerWorkflowStatus(),
                entity.getSellerReviewNote(),
                entity.getSubmittedAt(),
                entity.getReviewedAt(),
                entity.getPublishedAt(),

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
        entity.setCurrentRent(dto.currentRent());
        entity.setExitStrategy(dto.exitStrategy());
        entity.setClosingTerms(dto.closingTerms());
        entity.setOccupancyCertificate(dto.occupancyCertificate());

        if (dto.photos() != null) {
            if (entity.getPhotos() == null) {
                entity.setPhotos(new ArrayList<>());
            }

            List<PropertyPhoto> existingPhotos = entity.getPhotos();
            Map<String, PropertyPhoto> existingByAssetId = existingPhotos.stream()
                    .filter(photo -> photo != null && photo.getPhotoAssetId() != null)
                    .collect(Collectors.toMap(
                            PropertyPhoto::getPhotoAssetId,
                            photo -> photo,
                            (left, right) -> left,
                            LinkedHashMap::new
                    ));

            List<PropertyPhoto> nextPhotos = new ArrayList<>();
            Set<String> keepAssetIds = dto.photos().stream()
                    .map(photoDto -> photoDto.photoAssetId())
                    .collect(Collectors.toSet());

            // Remove photos that are no longer present in the payload.
            existingPhotos.removeIf(photo ->
                    photo == null
                            || photo.getPhotoAssetId() == null
                            || !keepAssetIds.contains(photo.getPhotoAssetId())
            );

            for (int idx = 0; idx < dto.photos().size(); idx++) {
                var photoDto = dto.photos().get(idx);
                String assetId = photoDto.photoAssetId();

                PropertyPhoto photo = existingByAssetId.get(assetId);
                if (photo == null) {
                    photo = PropertyPhotoMapper.toEntity(photoDto, entity);
                    if (photo == null) continue;
                    existingPhotos.add(photo);
                }

                photo.setProperty(entity);
                photo.setPhotoAssetId(assetId);
                photo.setSortOrder(photoDto.sortOrder() != null ? photoDto.sortOrder() : idx);
                photo.setCaption(photoDto.caption());
                nextPhotos.add(photo);
            }

            existingPhotos.clear();
            existingPhotos.addAll(nextPhotos);
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

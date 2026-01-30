package com.megna.backend.services;

import com.megna.backend.dtos.property.PropertyResponseDto;
import com.megna.backend.dtos.property.PropertyUpsertRequestDto;
import com.megna.backend.entities.Property;
import com.megna.backend.enums.ExitStrategy;
import com.megna.backend.enums.OccupancyStatus;
import com.megna.backend.enums.PropertyStatus;
import com.megna.backend.mappers.PropertyMapper;
import com.megna.backend.repositories.PropertyRepository;
import com.megna.backend.specifications.PropertySpecifications;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.util.List;

@Service
@RequiredArgsConstructor
public class PropertyService {

    private final PropertyRepository propertyRepository;

    public PropertyResponseDto create(PropertyUpsertRequestDto dto) {
        Property property = PropertyMapper.toEntity(dto);
        Property saved = propertyRepository.save(property);
        return PropertyMapper.toDto(saved);
    }

    public PropertyResponseDto getById(Long id) {
        Property property = propertyRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Property not found: " + id));
        return PropertyMapper.toDto(property);
    }

    public List<PropertyResponseDto> getAll() {
        return propertyRepository.findAll().stream()
                .map(PropertyMapper::toDto)
                .toList();
    }

    public PropertyResponseDto update(Long id, PropertyUpsertRequestDto dto) {
        Property property = propertyRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Property not found: " + id));

        PropertyMapper.applyUpsert(dto, property);

        Property saved = propertyRepository.save(property);
        return PropertyMapper.toDto(saved);
    }

    public void delete(Long id) {
        if (!propertyRepository.existsById(id)) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Property not found: " + id);
        }
        propertyRepository.deleteById(id);
    }

    public List<PropertyResponseDto> search(
            PropertyStatus status,
            String city,
            String state,
            Integer minBeds,
            Integer maxBeds,
            BigDecimal minAskingPrice,
            BigDecimal maxAskingPrice,
            BigDecimal minArv,
            BigDecimal maxArv,
            OccupancyStatus occupancyStatus,
            ExitStrategy exitStrategy
    ) {
        var spec = PropertySpecifications.withFilters(
                status,
                city,
                state,
                minBeds,
                maxBeds,
                minAskingPrice,
                maxAskingPrice,
                minArv,
                maxArv,
                occupancyStatus,
                exitStrategy
        );

        return propertyRepository.findAll(spec).stream()
                .map(PropertyMapper::toDto)
                .toList();
    }
}

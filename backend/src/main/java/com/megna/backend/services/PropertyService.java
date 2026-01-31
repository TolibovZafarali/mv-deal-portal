package com.megna.backend.services;

import com.megna.backend.dtos.property.PropertyResponseDto;
import com.megna.backend.dtos.property.PropertyUpsertRequestDto;
import com.megna.backend.entities.Investor;
import com.megna.backend.entities.Property;
import com.megna.backend.enums.ExitStrategy;
import com.megna.backend.enums.InvestorStatus;
import com.megna.backend.enums.OccupancyStatus;
import com.megna.backend.enums.PropertyStatus;
import com.megna.backend.mappers.PropertyMapper;
import com.megna.backend.repositories.InvestorRepository;
import com.megna.backend.repositories.PropertyRepository;
import com.megna.backend.security.AuthPrincipal;
import com.megna.backend.security.SecurityUtils;
import com.megna.backend.specifications.PropertySpecifications;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;

@Service
@RequiredArgsConstructor
public class PropertyService {

    private final PropertyRepository propertyRepository;
    private final InvestorRepository investorRepository;

    public PropertyResponseDto create(PropertyUpsertRequestDto dto) {
        Property property = PropertyMapper.toEntity(dto);
        Property saved = propertyRepository.save(property);
        return PropertyMapper.toDto(saved);
    }

    public PropertyResponseDto getById(Long id) {
        requireApprovedInvestor();

        Property property = propertyRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Property not found: " + id));

        return PropertyMapper.toDto(property);
    }

    public Page<PropertyResponseDto> getAll(Pageable pageable) {
        requireApprovedInvestor();

        return propertyRepository.findAll(pageable)
                .map(PropertyMapper::toDto);
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

    public Page<PropertyResponseDto> search(
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
            ExitStrategy exitStrategy,
            Pageable pageable
    ) {
        requireApprovedInvestor();

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

        return propertyRepository.findAll(spec, pageable)
                .map(PropertyMapper::toDto);
    }

    private AuthPrincipal principal() {
        return SecurityUtils.requirePrincipal();
    }

    private boolean isAdmin() {
        return "ADMIN".equalsIgnoreCase(principal().role());
    }

    private void requireApprovedInvestor() {
        if (isAdmin()) return;

        long investorId = principal().investorId();

        Investor investor = investorRepository.findById(investorId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Not authenticated"));

        if (investor.getStatus() != InvestorStatus.APPROVED) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Investor is not approved");
        }
    }
}

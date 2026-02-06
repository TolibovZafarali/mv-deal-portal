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

import static com.megna.backend.enums.PropertyStatus.ACTIVE;

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
        boolean admin = requireApprovedInvestorOrAdmin();

        Property property = propertyRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Property not found: " + id));

        requireVisibleToPrincipal(property, admin);
        return PropertyMapper.toDto(property);
    }

    public Page<PropertyResponseDto> getAll(Pageable pageable) {
        boolean admin = requireApprovedInvestorOrAdmin();

        if (!admin) {
            return propertyRepository.findAll(
                    PropertySpecifications.withFilters(ACTIVE, null, null, null, null, null, null, null, null, null, null),
                    pageable
            )
                    .map(PropertyMapper::toDto);
        }

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
        boolean admin = requireApprovedInvestorOrAdmin();

        PropertyStatus effectiveStatus = admin ? status : ACTIVE;

        var spec = PropertySpecifications.withFilters(
                effectiveStatus,
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

    private boolean requireApprovedInvestorOrAdmin() {
        if (isAdmin()) return true;

        long investorId = principal().userId();

        Investor investor = investorRepository.findById(investorId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Not authenticated"));

        InvestorStatus status = investor.getStatus();

        if (status != InvestorStatus.APPROVED) {
            throw new ResponseStatusException(
                    HttpStatus.FORBIDDEN,
                    "Access denied: investor status is " + status.name()
            );
        }

        return false;
    }

    private void requireVisibleToPrincipal(Property property, boolean admin) {
        if (!admin && property.getStatus() != ACTIVE) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Property not found: " + property.getId());
        }
    }
}

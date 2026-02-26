package com.megna.backend.application.service;

import com.megna.backend.interfaces.rest.dto.property.PropertyResponseDto;
import com.megna.backend.interfaces.rest.dto.property.PropertyUpsertRequestDto;
import com.megna.backend.domain.entity.Investor;
import com.megna.backend.domain.entity.Property;
import com.megna.backend.domain.enums.ClosingTerms;
import com.megna.backend.domain.enums.ExitStrategy;
import com.megna.backend.domain.enums.InvestorStatus;
import com.megna.backend.domain.enums.OccupancyStatus;
import com.megna.backend.domain.enums.PropertyStatus;
import com.megna.backend.interfaces.rest.mapper.PropertyMapper;
import com.megna.backend.domain.repository.InvestorRepository;
import com.megna.backend.domain.repository.PropertyRepository;
import com.megna.backend.infrastructure.security.AuthPrincipal;
import com.megna.backend.infrastructure.security.SecurityUtils;
import com.megna.backend.application.specification.PropertySpecifications;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.Objects;

import static com.megna.backend.domain.enums.PropertyStatus.ACTIVE;

@Service
@RequiredArgsConstructor
public class PropertyService {

    private final PropertyRepository propertyRepository;
    private final InvestorRepository investorRepository;
    private final PropertyAddressAutocompleteService propertyAddressAutocompleteService;
    private final FmrLookupService fmrLookupService;

    public PropertyResponseDto create(PropertyUpsertRequestDto dto) {
        Property property = PropertyMapper.toEntity(dto);
        refreshCoordinates(property, true);
        refreshFmr(property);
        validateForActiveStatus(property);
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
                    PropertySpecifications.withFilters(ACTIVE, null, null, null, null, null, null, null, null, null, null, null, null, null),
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

        String originalAddressFingerprint = addressFingerprint(property);
        String originalZip = FmrLookupService.normalizeZip(property.getZip());
        Integer originalBeds = property.getBeds();
        PropertyMapper.applyUpsert(dto, property);

        boolean addressChanged = !Objects.equals(originalAddressFingerprint, addressFingerprint(property));
        boolean coordinatesMissing = property.getLatitude() == null || property.getLongitude() == null;
        if (addressChanged || coordinatesMissing) {
            refreshCoordinates(property, true);
        }

        String updatedZip = FmrLookupService.normalizeZip(property.getZip());
        Integer updatedBeds = property.getBeds();
        boolean fmrInputsChanged = !Objects.equals(originalZip, updatedZip)
                || !Objects.equals(originalBeds, updatedBeds);
        if (fmrInputsChanged) {
            refreshFmr(property);
        }

        validateForActiveStatus(property);

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
            String query,
            String city,
            String state,
            Integer minBeds,
            Integer maxBeds,
            BigDecimal minBaths,
            BigDecimal minAskingPrice,
            BigDecimal maxAskingPrice,
            BigDecimal minArv,
            BigDecimal maxArv,
            OccupancyStatus occupancyStatus,
            ExitStrategy exitStrategy,
            ClosingTerms closingTerms,
            Pageable pageable
    ) {
        boolean admin = requireApprovedInvestorOrAdmin();

        PropertyStatus effectiveStatus = admin ? status : ACTIVE;

        var spec = PropertySpecifications.withFilters(
                effectiveStatus,
                query,
                city,
                state,
                minBeds,
                maxBeds,
                minBaths,
                minAskingPrice,
                maxAskingPrice,
                minArv,
                maxArv,
                occupancyStatus,
                exitStrategy,
                closingTerms
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

    private void validateForActiveStatus(Property property) {
        if (property.getStatus() != ACTIVE) return;

        List<String> missingFields = new ArrayList<>();

        requireNotBlank(property.getStreet1(), "street1", missingFields);
        requireNotBlank(property.getCity(), "city", missingFields);
        requireNotBlank(property.getState(), "state", missingFields);
        requireNotBlank(property.getZip(), "zip", missingFields);
        requireNotNull(property.getAskingPrice(), "askingPrice", missingFields);
        requireNotNull(property.getArv(), "arv", missingFields);
        requireNotNull(property.getEstRepairs(), "estRepairs", missingFields);
        requireNotNull(property.getBeds(), "beds", missingFields);
        requireNotNull(property.getBaths(), "baths", missingFields);
        requireNotNull(property.getLivingAreaSqft(), "livingAreaSqft", missingFields);
        requireNotNull(property.getYearBuilt(), "yearBuilt", missingFields);
        requireNotNull(property.getOccupancyStatus(), "occupancyStatus", missingFields);
        requireNotNull(property.getExitStrategy(), "exitStrategy", missingFields);
        requireNotNull(property.getClosingTerms(), "closingTerms", missingFields);

        boolean hasAtLeastOnePhoto = property.getPhotos() != null
                && property.getPhotos().stream().anyMatch(photo -> photo != null && photo.getUrl() != null && !photo.getUrl().isBlank());
        if (!hasAtLeastOnePhoto) {
            missingFields.add("photos (at least one)");
        }

        if (!missingFields.isEmpty()) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Cannot set status to ACTIVE while required fields are missing: " + String.join(", ", missingFields)
            );
        }
    }

    private static void requireNotBlank(String value, String fieldName, List<String> missingFields) {
        if (value == null || value.isBlank()) {
            missingFields.add(fieldName);
        }
    }

    private static void requireNotNull(Object value, String fieldName, List<String> missingFields) {
        if (value == null) {
            missingFields.add(fieldName);
        }
    }

    private void refreshCoordinates(Property property, boolean clearWhenUnavailable) {
        if (property == null) return;

        String street1 = normalizeAddressPart(property.getStreet1());
        String city = normalizeAddressPart(property.getCity());
        String state = normalizeAddressPart(property.getState());
        String zip = normalizeAddressPart(property.getZip());

        boolean hasAddress = !street1.isBlank() || !city.isBlank() || !state.isBlank() || !zip.isBlank();
        if (!hasAddress) {
            if (clearWhenUnavailable) {
                property.setLatitude(null);
                property.setLongitude(null);
            }
            return;
        }

        propertyAddressAutocompleteService.geocode(street1, city, state, zip)
                .ifPresentOrElse(
                        coordinates -> {
                            property.setLatitude(coordinates.latitude());
                            property.setLongitude(coordinates.longitude());
                        },
                        () -> {
                            if (clearWhenUnavailable) {
                                property.setLatitude(null);
                                property.setLongitude(null);
                            }
                        }
                );
    }

    private void refreshFmr(Property property) {
        if (property == null) return;
        property.setFmr(fmrLookupService.lookup(property.getZip(), property.getBeds()));
    }

    private static String addressFingerprint(Property property) {
        if (property == null) return "";

        return String.join("|",
                normalizeAddressPart(property.getStreet1()).toLowerCase(Locale.US),
                normalizeAddressPart(property.getCity()).toLowerCase(Locale.US),
                normalizeAddressPart(property.getState()).toLowerCase(Locale.US),
                normalizeAddressPart(property.getZip()).toLowerCase(Locale.US)
        );
    }

    private static String normalizeAddressPart(String value) {
        return value == null ? "" : value.trim();
    }
}

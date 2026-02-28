package com.megna.backend.application.service;

import com.megna.backend.application.specification.PropertySpecifications;
import com.megna.backend.domain.entity.Admin;
import com.megna.backend.domain.entity.Investor;
import com.megna.backend.domain.entity.PhotoAsset;
import com.megna.backend.domain.entity.Property;
import com.megna.backend.domain.entity.PropertyChangeRequest;
import com.megna.backend.domain.entity.Seller;
import com.megna.backend.domain.enums.ClosingTerms;
import com.megna.backend.domain.enums.ExitStrategy;
import com.megna.backend.domain.enums.InvestorStatus;
import com.megna.backend.domain.enums.OccupancyStatus;
import com.megna.backend.domain.enums.PropertyChangeRequestStatus;
import com.megna.backend.domain.enums.PropertyStatus;
import com.megna.backend.domain.enums.SellerStatus;
import com.megna.backend.domain.enums.SellerWorkflowStatus;
import com.megna.backend.domain.repository.AdminRepository;
import com.megna.backend.domain.repository.InvestorRepository;
import com.megna.backend.domain.repository.PropertyChangeRequestRepository;
import com.megna.backend.domain.repository.PropertyRepository;
import com.megna.backend.domain.repository.SellerRepository;
import com.megna.backend.infrastructure.security.AuthPrincipal;
import com.megna.backend.infrastructure.security.SecurityUtils;
import com.megna.backend.interfaces.rest.dto.property.AdminPropertyChangeRequestDecisionAction;
import com.megna.backend.interfaces.rest.dto.property.AdminPropertySellerReviewAction;
import com.megna.backend.interfaces.rest.dto.property.PropertyChangeRequestResponseDto;
import com.megna.backend.interfaces.rest.dto.property.PropertyResponseDto;
import com.megna.backend.interfaces.rest.dto.property.PropertyUpsertRequestDto;
import com.megna.backend.interfaces.rest.mapper.PropertyChangeRequestMapper;
import com.megna.backend.interfaces.rest.mapper.PropertyMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;

import static com.megna.backend.domain.enums.PropertyStatus.ACTIVE;

@Service
@RequiredArgsConstructor
public class PropertyService {

    private final PropertyRepository propertyRepository;
    private final InvestorRepository investorRepository;
    private final SellerRepository sellerRepository;
    private final AdminRepository adminRepository;
    private final PropertyChangeRequestRepository propertyChangeRequestRepository;
    private final PropertyAddressAutocompleteService propertyAddressAutocompleteService;
    private final FmrLookupService fmrLookupService;
    private final PhotoAssetService photoAssetService;

    public PropertyResponseDto create(PropertyUpsertRequestDto dto) {
        Property property = PropertyMapper.toEntity(dto);
        if (dto.photos() != null) {
            long adminId = requireAdminId();
            hydratePhotoAssets(property, null, adminId);
        }
        refreshCoordinates(property, true);
        refreshFmr(property);
        validateForActiveStatus(property);
        syncSellerWorkflowForAdminManagedProperty(property);
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
        List<String> originalPhotoAssetIds = photoAssetService.collectPhotoAssetIds(property.getPhotos());
        PropertyMapper.applyUpsert(dto, property);

        if (dto.photos() != null) {
            long adminId = requireAdminId();
            hydratePhotoAssets(property, property.getId(), adminId);

            List<String> updatedPhotoAssetIds = photoAssetService.collectPhotoAssetIds(property.getPhotos());
            photoAssetService.forEachRemovedAsset(
                    originalPhotoAssetIds,
                    updatedPhotoAssetIds,
                    photoAssetService::markDeletedPending
            );
        }

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
        syncSellerWorkflowForAdminManagedProperty(property);

        Property saved = propertyRepository.save(property);
        return PropertyMapper.toDto(saved);
    }

    public void delete(Long id) {
        Property property = propertyRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Property not found: " + id));

        List<String> photoAssetIds = photoAssetService.collectPhotoAssetIds(property.getPhotos());
        photoAssetService.markDeletedPending(photoAssetIds);
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
            SellerWorkflowStatus sellerWorkflowStatus,
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
                closingTerms,
                null,
                admin ? sellerWorkflowStatus : null
        );

        return propertyRepository.findAll(spec, pageable)
                .map(PropertyMapper::toDto);
    }

    public Page<PropertyResponseDto> getSellerProperties(Long sellerId, Pageable pageable) {
        requireSelfSellerOrAdmin(sellerId);

        var spec = PropertySpecifications.withFilters(
                null,
                null,
                null,
                null,
                null,
                null,
                null,
                null,
                null,
                null,
                null,
                null,
                null,
                null,
                sellerId
        );

        return propertyRepository.findAll(spec, pageable)
                .map(PropertyMapper::toDto);
    }

    public PropertyResponseDto getSellerPropertyById(Long sellerId, Long propertyId) {
        requireSelfSellerOrAdmin(sellerId);

        Property property = propertyRepository.findById(propertyId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Property not found: " + propertyId));

        requireSellerOwnsProperty(property, sellerId);
        return PropertyMapper.toDto(property);
    }

    public PropertyResponseDto createBySeller(Long sellerId, PropertyUpsertRequestDto dto) {
        requireSelfSeller(sellerId);
        Seller seller = requireActiveSeller(sellerId);

        if (dto.photos() != null && !dto.photos().isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Seller draft photo uploads are not supported yet");
        }

        Property property = PropertyMapper.toEntity(dto);
        property.setSeller(seller);
        property.setStatus(PropertyStatus.DRAFT);
        property.setSellerWorkflowStatus(SellerWorkflowStatus.DRAFT);
        property.setSellerReviewNote(null);
        property.setSubmittedAt(null);
        property.setReviewedAt(null);
        property.setPublishedAt(null);

        refreshCoordinates(property, true);
        refreshFmr(property);

        Property saved = propertyRepository.save(property);
        return PropertyMapper.toDto(saved);
    }

    public PropertyResponseDto updateBySeller(Long sellerId, Long propertyId, PropertyUpsertRequestDto dto) {
        requireSelfSeller(sellerId);

        Property property = propertyRepository.findById(propertyId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Property not found: " + propertyId));
        requireSellerOwnsProperty(property, sellerId);

        SellerWorkflowStatus workflowStatus = property.getSellerWorkflowStatus();
        if (workflowStatus != SellerWorkflowStatus.DRAFT && workflowStatus != SellerWorkflowStatus.CHANGES_REQUESTED) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Property is not editable in the current workflow state");
        }

        if (dto.photos() != null && !dto.photos().isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Seller draft photo uploads are not supported yet");
        }

        String originalAddressFingerprint = addressFingerprint(property);
        String originalZip = FmrLookupService.normalizeZip(property.getZip());
        Integer originalBeds = property.getBeds();

        PropertyMapper.applyUpsert(dto, property);
        property.setStatus(PropertyStatus.DRAFT);

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

        Property saved = propertyRepository.save(property);
        return PropertyMapper.toDto(saved);
    }

    public PropertyResponseDto submitBySeller(Long sellerId, Long propertyId) {
        requireSelfSeller(sellerId);

        Property property = propertyRepository.findById(propertyId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Property not found: " + propertyId));
        requireSellerOwnsProperty(property, sellerId);

        SellerWorkflowStatus workflowStatus = property.getSellerWorkflowStatus();
        if (workflowStatus != SellerWorkflowStatus.DRAFT && workflowStatus != SellerWorkflowStatus.CHANGES_REQUESTED) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Property cannot be submitted in the current workflow state");
        }

        property.setStatus(PropertyStatus.DRAFT);
        property.setSellerWorkflowStatus(SellerWorkflowStatus.SUBMITTED);
        property.setSubmittedAt(LocalDateTime.now());

        Property saved = propertyRepository.save(property);
        return PropertyMapper.toDto(saved);
    }

    public PropertyChangeRequestResponseDto createChangeRequestBySeller(Long sellerId, Long propertyId, String requestedChanges) {
        requireSelfSeller(sellerId);

        Property property = propertyRepository.findById(propertyId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Property not found: " + propertyId));
        requireSellerOwnsProperty(property, sellerId);

        if (property.getStatus() != ACTIVE || property.getSellerWorkflowStatus() != SellerWorkflowStatus.PUBLISHED) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Can only request changes for active published listings");
        }

        String message = requestedChanges == null ? "" : requestedChanges.trim();
        if (message.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "requestedChanges is required");
        }

        Seller seller = requireActiveSeller(sellerId);

        PropertyChangeRequest changeRequest = new PropertyChangeRequest();
        changeRequest.setProperty(property);
        changeRequest.setSeller(seller);
        changeRequest.setRequestedChanges(message);
        changeRequest.setStatus(PropertyChangeRequestStatus.OPEN);

        PropertyChangeRequest saved = propertyChangeRequestRepository.save(changeRequest);
        return PropertyChangeRequestMapper.toDto(saved);
    }

    public PropertyResponseDto assignSeller(Long propertyId, Long sellerId) {
        requireAdmin();

        Property property = propertyRepository.findById(propertyId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Property not found: " + propertyId));

        if (sellerId == null) {
            property.setSeller(null);
            property.setSellerWorkflowStatus(null);
            property.setSellerReviewNote(null);
            property.setSubmittedAt(null);
            property.setReviewedAt(null);
            property.setPublishedAt(null);
        } else {
            Seller seller = requireActiveSeller(sellerId);
            property.setSeller(seller);

            if (property.getStatus() == PropertyStatus.ACTIVE) {
                property.setSellerWorkflowStatus(SellerWorkflowStatus.PUBLISHED);
                if (property.getPublishedAt() == null) {
                    property.setPublishedAt(LocalDateTime.now());
                }
            } else if (property.getStatus() == PropertyStatus.CLOSED) {
                property.setSellerWorkflowStatus(SellerWorkflowStatus.CLOSED);
            } else if (property.getSellerWorkflowStatus() == null) {
                property.setSellerWorkflowStatus(SellerWorkflowStatus.DRAFT);
            }
        }

        Property saved = propertyRepository.save(property);
        return PropertyMapper.toDto(saved);
    }

    public PropertyResponseDto reviewSellerProperty(Long propertyId, AdminPropertySellerReviewAction action, String reviewNote) {
        requireAdmin();

        if (action == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "action is required");
        }

        Property property = propertyRepository.findById(propertyId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Property not found: " + propertyId));

        if (property.getSeller() == null) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Property is not assigned to a seller");
        }

        if (property.getSellerWorkflowStatus() != SellerWorkflowStatus.SUBMITTED) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Only submitted properties can be reviewed");
        }

        String normalizedNote = normalizeOptionalText(reviewNote);

        if (action == AdminPropertySellerReviewAction.REQUEST_CHANGES) {
            if (normalizedNote == null || normalizedNote.isBlank()) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "reviewNote is required when requesting changes");
            }
            property.setStatus(PropertyStatus.DRAFT);
            property.setSellerWorkflowStatus(SellerWorkflowStatus.CHANGES_REQUESTED);
            property.setSellerReviewNote(normalizedNote);
            property.setReviewedAt(LocalDateTime.now());
        } else {
            property.setStatus(PropertyStatus.ACTIVE);
            property.setSellerWorkflowStatus(SellerWorkflowStatus.PUBLISHED);
            property.setSellerReviewNote(normalizedNote);
            property.setReviewedAt(LocalDateTime.now());
            property.setPublishedAt(LocalDateTime.now());
            validateForActiveStatus(property);
        }

        Property saved = propertyRepository.save(property);
        return PropertyMapper.toDto(saved);
    }

    public Page<PropertyChangeRequestResponseDto> getAdminChangeRequests(PropertyChangeRequestStatus status, Pageable pageable) {
        requireAdmin();

        Page<PropertyChangeRequest> page = status == null
                ? propertyChangeRequestRepository.findAll(pageable)
                : propertyChangeRequestRepository.findByStatusOrderByCreatedAtDesc(status, pageable);

        return page.map(PropertyChangeRequestMapper::toDto);
    }

    public PropertyChangeRequestResponseDto moderateChangeRequest(
            Long requestId,
            AdminPropertyChangeRequestDecisionAction action,
            String adminNote
    ) {
        long adminId = requireAdminId();

        if (action == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "action is required");
        }

        PropertyChangeRequest request = propertyChangeRequestRepository.findById(requestId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Property change request not found: " + requestId));

        if (request.getStatus() != PropertyChangeRequestStatus.OPEN) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Change request has already been resolved");
        }

        Admin admin = adminRepository.findById(adminId).orElse(null);

        request.setStatus(action == AdminPropertyChangeRequestDecisionAction.APPLIED
                ? PropertyChangeRequestStatus.APPLIED
                : PropertyChangeRequestStatus.REJECTED);
        request.setAdminNote(normalizeOptionalText(adminNote));
        request.setResolvedAt(LocalDateTime.now());
        request.setResolvedByAdmin(admin);

        PropertyChangeRequest saved = propertyChangeRequestRepository.save(request);
        return PropertyChangeRequestMapper.toDto(saved);
    }

    public Page<PropertyChangeRequestResponseDto> getSellerChangeRequests(Long sellerId, Pageable pageable) {
        requireSelfSellerOrAdmin(sellerId);
        return propertyChangeRequestRepository.findBySellerIdOrderByCreatedAtDesc(sellerId, pageable)
                .map(PropertyChangeRequestMapper::toDto);
    }

    private AuthPrincipal principal() {
        return SecurityUtils.requirePrincipal();
    }

    private boolean isAdmin() {
        return "ADMIN".equalsIgnoreCase(principal().role());
    }

    private void requireAdmin() {
        if (!isAdmin()) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Forbidden");
        }
    }

    private void requireSelfSeller(Long sellerId) {
        if (sellerId == null || sellerId <= 0) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Forbidden");
        }

        AuthPrincipal principal = principal();
        if (!"SELLER".equalsIgnoreCase(principal.role()) || principal.userId() != sellerId) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Forbidden");
        }
    }

    private void requireSelfSellerOrAdmin(Long sellerId) {
        if (sellerId == null || sellerId <= 0) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Forbidden");
        }
        if (isAdmin()) return;
        requireSelfSeller(sellerId);
    }

    private Seller requireActiveSeller(Long sellerId) {
        Seller seller = sellerRepository.findById(sellerId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Seller not found: " + sellerId));

        if (seller.getStatus() != SellerStatus.ACTIVE) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Seller is not active");
        }

        return seller;
    }

    private void requireSellerOwnsProperty(Property property, Long sellerId) {
        Long ownerId = property.getSeller() == null ? null : property.getSeller().getId();
        if (!Objects.equals(ownerId, sellerId)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Forbidden");
        }
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
                && property.getPhotos().stream().anyMatch(photo ->
                        photo != null
                                && StringUtils.hasText(photo.getPhotoAssetId())
                                && StringUtils.hasText(photo.getUrl())
                );
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

    private long requireAdminId() {
        AuthPrincipal authPrincipal = principal();
        if (!"ADMIN".equalsIgnoreCase(authPrincipal.role())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Only admins can perform this action");
        }
        return authPrincipal.userId();
    }

    private void hydratePhotoAssets(Property property, Long currentPropertyId, long adminId) {
        List<String> photoAssetIds = photoAssetService.collectPhotoAssetIds(property.getPhotos());
        Map<String, PhotoAsset> resolvedAssets = photoAssetService.resolveReadyAssetsOrThrow(
                photoAssetIds,
                currentPropertyId,
                adminId
        );
        photoAssetService.applyAssetUrlsToPhotos(property.getPhotos(), resolvedAssets);
    }

    private void syncSellerWorkflowForAdminManagedProperty(Property property) {
        if (property == null || property.getSeller() == null) return;

        if (property.getStatus() == PropertyStatus.CLOSED) {
            property.setSellerWorkflowStatus(SellerWorkflowStatus.CLOSED);
            return;
        }

        if (property.getStatus() == PropertyStatus.ACTIVE) {
            property.setSellerWorkflowStatus(SellerWorkflowStatus.PUBLISHED);
            if (property.getPublishedAt() == null) {
                property.setPublishedAt(LocalDateTime.now());
            }
            return;
        }

        if (property.getSellerWorkflowStatus() == null) {
            property.setSellerWorkflowStatus(SellerWorkflowStatus.DRAFT);
        }
    }

    private static String normalizeOptionalText(String value) {
        if (value == null) return null;
        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }
}

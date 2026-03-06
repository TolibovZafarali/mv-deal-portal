package com.megna.backend.application.service;

import com.megna.backend.application.specification.PropertySpecifications;
import com.megna.backend.domain.entity.Investor;
import com.megna.backend.domain.entity.PhotoAsset;
import com.megna.backend.domain.entity.Property;
import com.megna.backend.domain.entity.PropertyPhoto;
import com.megna.backend.domain.entity.Seller;
import com.megna.backend.domain.enums.ClosingTerms;
import com.megna.backend.domain.enums.ExitStrategy;
import com.megna.backend.domain.enums.InvestorStatus;
import com.megna.backend.domain.enums.OccupancyStatus;
import com.megna.backend.domain.enums.PhotoAssetPrincipalRole;
import com.megna.backend.domain.enums.PropertyStatus;
import com.megna.backend.domain.enums.SellerStatus;
import com.megna.backend.domain.enums.SellerWorkflowStatus;
import com.megna.backend.domain.repository.InvestorRepository;
import com.megna.backend.domain.repository.PropertyRepository;
import com.megna.backend.domain.repository.SellerRepository;
import com.megna.backend.infrastructure.security.AuthPrincipal;
import com.megna.backend.infrastructure.security.SecurityUtils;
import com.megna.backend.interfaces.rest.dto.property.AdminPropertySellerReviewAction;
import com.megna.backend.interfaces.rest.dto.property.PropertyResponseDto;
import com.megna.backend.interfaces.rest.dto.property.PropertyUpsertRequestDto;
import com.megna.backend.interfaces.rest.dto.property.PropertyPhotoRequestDto;
import com.megna.backend.interfaces.rest.dto.property.SellerPropertyDraftUpsertRequestDto;
import com.megna.backend.interfaces.rest.mapper.PropertyMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.HashSet;

import static com.megna.backend.domain.enums.PropertyStatus.ACTIVE;

@Service
@RequiredArgsConstructor
public class PropertyService {

    private static final BigDecimal MAX_MONEY_FILTER = new BigDecimal("9999999999.99");
    private static final BigDecimal MAX_BATHS_FILTER = new BigDecimal("99.9");

    private final PropertyRepository propertyRepository;
    private final InvestorRepository investorRepository;
    private final SellerRepository sellerRepository;
    private final PropertyAddressAutocompleteService propertyAddressAutocompleteService;
    private final FmrLookupService fmrLookupService;
    private final PhotoAssetService photoAssetService;
    private final SellerThreadService sellerThreadService;
    private final PropertyPublicationNotificationService propertyPublicationNotificationService;

    @Transactional
    public PropertyResponseDto create(PropertyUpsertRequestDto dto) {
        validateUniquePhotoAssetIds(dto.photos());
        Property property = PropertyMapper.toEntity(dto);
        normalizeCurrentRentForOccupancy(property);
        if (dto.photos() != null) {
            long adminId = requireAdminId();
            hydratePhotoAssets(property, null, PhotoAssetPrincipalRole.ADMIN, adminId);
        }
        refreshCoordinates(property, true);
        refreshFmr(property);
        validateForActiveStatus(property);
        syncSellerWorkflowForAdminManagedProperty(property);
        Property saved = saveProperty(property);
        enqueueInvestorNotificationsIfFirstActivePublish(saved, null);
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

        return propertyRepository.findAll(PropertySpecifications.visibleToAdmin(), pageable)
                .map(PropertyMapper::toDto);
    }

    @Transactional
    public PropertyResponseDto update(Long id, PropertyUpsertRequestDto dto) {
        validateUniquePhotoAssetIds(dto.photos());
        Property property = propertyRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Property not found: " + id));
        PropertyStatus originalStatus = property.getStatus();

        String originalAddressFingerprint = addressFingerprint(property);
        String originalZip = FmrLookupService.normalizeZip(property.getZip());
        Integer originalBeds = property.getBeds();
        List<String> originalPhotoAssetIds = photoAssetService.collectPhotoAssetIds(property.getPhotos());
        PropertyMapper.applyUpsert(dto, property);
        normalizeCurrentRentForOccupancy(property);

        if (dto.photos() != null) {
            long adminId = requireAdminId();
            hydratePhotoAssets(property, property.getId(), PhotoAssetPrincipalRole.ADMIN, adminId);

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

        Property saved = saveProperty(property);
        enqueueInvestorNotificationsIfFirstActivePublish(saved, originalStatus);
        return PropertyMapper.toDto(saved);
    }

    public void delete(Long id) {
        Property property = propertyRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Property not found: " + id));

        deletePropertyWithPhotos(property);
    }

    public void deleteBySeller(Long sellerId, Long propertyId) {
        requireSelfSeller(sellerId);

        Property property = propertyRepository.findById(propertyId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Property not found: " + propertyId));
        requireSellerOwnsProperty(property, sellerId);

        SellerWorkflowStatus workflowStatus = property.getSellerWorkflowStatus();
        if (workflowStatus != SellerWorkflowStatus.DRAFT && workflowStatus != SellerWorkflowStatus.CHANGES_REQUESTED) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Property cannot be deleted in the current workflow state");
        }

        deletePropertyWithPhotos(property);
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
        return search(
                status,
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
                sellerWorkflowStatus,
                pageable
        );
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
            Long sellerId,
            SellerWorkflowStatus sellerWorkflowStatus,
            Pageable pageable
    ) {
        validateSearchFilters(minBeds, maxBeds, minBaths, minAskingPrice, maxAskingPrice, minArv, maxArv);

        boolean admin = requireApprovedInvestorOrAdmin();

        PropertyStatus effectiveStatus = admin ? status : ACTIVE;
        Long effectiveSellerId = admin ? sellerId : null;

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
                effectiveSellerId,
                admin ? sellerWorkflowStatus : null
        );

        if (admin) {
            spec = spec.and(PropertySpecifications.visibleToAdmin());
        }

        return propertyRepository.findAll(spec, pageable)
                .map(PropertyMapper::toDto);
    }

    public Page<PropertyResponseDto> getClosedPreview(Pageable pageable) {
        return propertyRepository.findAll(
                        PropertySpecifications.withFilters(
                                PropertyStatus.CLOSED,
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
                                null
                        ),
                        pageable
                )
                .map(PropertyMapper::toDto);
    }

    public BigDecimal lookupFmr(String zip, Integer beds) {
        return fmrLookupService.lookup(zip, beds);
    }

    private void validateSearchFilters(
            Integer minBeds,
            Integer maxBeds,
            BigDecimal minBaths,
            BigDecimal minAskingPrice,
            BigDecimal maxAskingPrice,
            BigDecimal minArv,
            BigDecimal maxArv
    ) {
        validateNonNegative("minBeds", minBeds);
        validateNonNegative("maxBeds", maxBeds);
        validateDecimalRange("minBaths", minBaths, BigDecimal.ZERO, MAX_BATHS_FILTER);
        validateDecimalRange("minAskingPrice", minAskingPrice, BigDecimal.ZERO, MAX_MONEY_FILTER);
        validateDecimalRange("maxAskingPrice", maxAskingPrice, BigDecimal.ZERO, MAX_MONEY_FILTER);
        validateDecimalRange("minArv", minArv, BigDecimal.ZERO, MAX_MONEY_FILTER);
        validateDecimalRange("maxArv", maxArv, BigDecimal.ZERO, MAX_MONEY_FILTER);
    }

    private void validateNonNegative(String field, Integer value) {
        if (value != null && value < 0) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, field + " must be greater than or equal to 0");
        }
    }

    private void validateDecimalRange(String field, BigDecimal value, BigDecimal min, BigDecimal max) {
        if (value == null) return;
        if (value.compareTo(min) < 0 || value.compareTo(max) > 0) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    field + " must be between " + min.toPlainString() + " and " + max.toPlainString()
            );
        }
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

    public PropertyResponseDto createBySeller(Long sellerId, SellerPropertyDraftUpsertRequestDto dto) {
        requireSelfSeller(sellerId);
        Seller seller = requireActiveSeller(sellerId);

        validateUniquePhotoAssetIds(dto.photos());
        Property property = new Property();
        applySellerDraftUpsert(dto, property);
        validateSellerAddressNotDuplicate(sellerId, property);
        property.setSeller(seller);
        property.setCreatedBySeller(seller);
        property.setStatus(PropertyStatus.DRAFT);
        property.setSellerWorkflowStatus(SellerWorkflowStatus.DRAFT);
        property.setSellerReviewNote(null);
        property.setSubmittedAt(null);
        property.setReviewedAt(null);
        property.setPublishedAt(null);
        normalizeCurrentRentForOccupancy(property);

        if (dto.photos() != null) {
            hydratePhotoAssets(property, null, PhotoAssetPrincipalRole.SELLER, sellerId);
        }

        refreshCoordinates(property, true);
        refreshFmr(property);

        Property saved = saveProperty(property);
        return PropertyMapper.toDto(saved);
    }

    public PropertyResponseDto updateBySeller(Long sellerId, Long propertyId, SellerPropertyDraftUpsertRequestDto dto) {
        requireSelfSeller(sellerId);

        Property property = propertyRepository.findById(propertyId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Property not found: " + propertyId));
        requireSellerOwnsProperty(property, sellerId);

        SellerWorkflowStatus workflowStatus = property.getSellerWorkflowStatus();
        if (workflowStatus != SellerWorkflowStatus.DRAFT && workflowStatus != SellerWorkflowStatus.CHANGES_REQUESTED) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Property is not editable in the current workflow state");
        }

        validateUniquePhotoAssetIds(dto.photos());
        String originalAddressFingerprint = addressFingerprint(property);
        String originalZip = FmrLookupService.normalizeZip(property.getZip());
        Integer originalBeds = property.getBeds();
        List<String> originalPhotoAssetIds = photoAssetService.collectPhotoAssetIds(property.getPhotos());

        applySellerDraftUpsert(dto, property);
        property.setStatus(PropertyStatus.DRAFT);
        normalizeCurrentRentForOccupancy(property);

        boolean addressChanged = !Objects.equals(originalAddressFingerprint, addressFingerprint(property));
        if (addressChanged) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Property address cannot be changed after initial save");
        }

        if (dto.photos() != null) {
            hydratePhotoAssets(property, property.getId(), PhotoAssetPrincipalRole.SELLER, sellerId);

            List<String> updatedPhotoAssetIds = photoAssetService.collectPhotoAssetIds(property.getPhotos());
            photoAssetService.forEachRemovedAsset(
                    originalPhotoAssetIds,
                    updatedPhotoAssetIds,
                    photoAssetService::markDeletedPending
            );
        }

        boolean coordinatesMissing = property.getLatitude() == null || property.getLongitude() == null;
        if (coordinatesMissing) {
            refreshCoordinates(property, true);
        }

        String updatedZip = FmrLookupService.normalizeZip(property.getZip());
        Integer updatedBeds = property.getBeds();
        boolean fmrInputsChanged = !Objects.equals(originalZip, updatedZip)
                || !Objects.equals(originalBeds, updatedBeds);
        if (fmrInputsChanged) {
            refreshFmr(property);
        }

        Property saved = saveProperty(property);
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

        Property saved = saveProperty(property);
        sellerThreadService.postSystemMessageForProperty(
                saved.getId(),
                sellerId,
                SellerThreadService.TOPIC_WORKFLOW,
                saved.getId(),
                "Listing submitted for review."
        );
        return PropertyMapper.toDto(saved);
    }

    public PropertyResponseDto assignSeller(Long propertyId, Long sellerId) {
        requireAdmin();

        Property property = propertyRepository.findById(propertyId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Property not found: " + propertyId));

        if (sellerId == null) {
            Long currentSellerId = property.getSeller() == null ? null : property.getSeller().getId();
            Long creatorSellerId = property.getCreatedBySeller() == null ? null : property.getCreatedBySeller().getId();
            if (currentSellerId != null && Objects.equals(currentSellerId, creatorSellerId)) {
                throw new ResponseStatusException(
                        HttpStatus.CONFLICT,
                        "Cannot unassign the seller who originally created this property"
                );
            }
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

        Property saved = saveProperty(property);
        return PropertyMapper.toDto(saved);
    }

    @Transactional
    public PropertyResponseDto reviewSellerProperty(Long propertyId, AdminPropertySellerReviewAction action, String reviewNote) {
        requireAdmin();

        if (action == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "action is required");
        }

        Property property = propertyRepository.findById(propertyId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Property not found: " + propertyId));
        PropertyStatus originalStatus = property.getStatus();

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

        Property saved = saveProperty(property);
        enqueueInvestorNotificationsIfFirstActivePublish(saved, originalStatus);
        if (action == AdminPropertySellerReviewAction.REQUEST_CHANGES) {
            sellerThreadService.postSystemMessageForProperty(
                    saved.getId(),
                    saved.getSeller().getId(),
                    SellerThreadService.TOPIC_WORKFLOW,
                    saved.getId(),
                    "Admin requested changes: " + normalizedNote
            );
        } else {
            sellerThreadService.postSystemMessageForProperty(
                    saved.getId(),
                    saved.getSeller().getId(),
                    SellerThreadService.TOPIC_WORKFLOW,
                    saved.getId(),
                    "Listing approved and published."
            );
        }
        return PropertyMapper.toDto(saved);
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
        if (admin && !isVisibleToAdmin(property)) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Property not found: " + property.getId());
        }
        if (!admin && property.getStatus() != ACTIVE) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Property not found: " + property.getId());
        }
    }

    private boolean isVisibleToAdmin(Property property) {
        if (property == null || property.getSeller() == null) {
            return true;
        }
        return property.getSellerWorkflowStatus() != SellerWorkflowStatus.DRAFT;
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
        if (property.getOccupancyStatus() == OccupancyStatus.YES) {
            requireNotNull(property.getCurrentRent(), "currentRent", missingFields);
        }
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

    private static void normalizeCurrentRentForOccupancy(Property property) {
        if (property == null) return;
        if (property.getOccupancyStatus() == OccupancyStatus.YES) return;
        property.setCurrentRent(null);
    }

    private void deletePropertyWithPhotos(Property property) {
        List<String> photoAssetIds = photoAssetService.collectPhotoAssetIds(property.getPhotos());
        photoAssetService.markDeletedPending(photoAssetIds);
        propertyRepository.deleteById(property.getId());
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

    private void validateSellerAddressNotDuplicate(Long sellerId, Property property) {
        String street1 = normalizeAddressPart(property == null ? null : property.getStreet1()).toLowerCase(Locale.US);
        String city = normalizeAddressPart(property == null ? null : property.getCity()).toLowerCase(Locale.US);
        String state = normalizeAddressPart(property == null ? null : property.getState()).toLowerCase(Locale.US);
        String zip = normalizeAddressPart(property == null ? null : property.getZip()).toLowerCase(Locale.US);

        if (street1.isBlank() || city.isBlank() || state.isBlank() || zip.isBlank()) {
            return;
        }

        boolean duplicateExists = propertyRepository.existsBySellerAndNormalizedAddress(
                sellerId,
                street1,
                city,
                state,
                zip
        );
        if (duplicateExists) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "You already have a property with this address.");
        }
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

    private void applySellerDraftUpsert(SellerPropertyDraftUpsertRequestDto dto, Property property) {
        if (dto == null || property == null) return;

        property.setStreet1(normalizeOptionalText(dto.street1()));
        property.setStreet2(normalizeOptionalText(dto.street2()));
        property.setCity(normalizeOptionalText(dto.city()));
        property.setState(normalizeOptionalText(dto.state()));
        property.setZip(normalizeOptionalText(dto.zip()));

        property.setAskingPrice(dto.askingPrice());
        property.setArv(dto.arv());
        property.setEstRepairs(dto.estRepairs());

        property.setBeds(dto.beds());
        property.setBaths(dto.baths());
        property.setLivingAreaSqft(dto.livingAreaSqft());
        property.setYearBuilt(dto.yearBuilt());
        property.setRoofAge(dto.roofAge());
        property.setHvac(dto.hvac());

        property.setOccupancyStatus(dto.occupancyStatus());
        property.setCurrentRent(dto.currentRent());
        property.setExitStrategy(dto.exitStrategy());
        property.setClosingTerms(dto.closingTerms());

        if (dto.photos() != null) {
            PropertyMapper.applyUpsert(
                    new PropertyUpsertRequestDto(
                            PropertyStatus.DRAFT,
                            dto.street1() == null ? "" : dto.street1(),
                            dto.street2(),
                            dto.city() == null ? "" : dto.city(),
                            dto.state() == null ? "" : dto.state(),
                            dto.zip() == null ? "" : dto.zip(),
                            dto.askingPrice(),
                            dto.arv(),
                            dto.estRepairs(),
                            dto.beds(),
                            dto.baths(),
                            dto.livingAreaSqft(),
                            dto.yearBuilt(),
                            dto.roofAge(),
                            dto.hvac(),
                            dto.occupancyStatus(),
                            dto.currentRent(),
                            dto.exitStrategy(),
                            dto.closingTerms(),
                            dto.photos(),
                            dto.saleComps()
                    ),
                    property
            );
            return;
        }

        if (dto.saleComps() != null) {
            PropertyMapper.applyUpsert(
                    new PropertyUpsertRequestDto(
                            PropertyStatus.DRAFT,
                            dto.street1() == null ? "" : dto.street1(),
                            dto.street2(),
                            dto.city() == null ? "" : dto.city(),
                            dto.state() == null ? "" : dto.state(),
                            dto.zip() == null ? "" : dto.zip(),
                            dto.askingPrice(),
                            dto.arv(),
                            dto.estRepairs(),
                            dto.beds(),
                            dto.baths(),
                            dto.livingAreaSqft(),
                            dto.yearBuilt(),
                            dto.roofAge(),
                            dto.hvac(),
                            dto.occupancyStatus(),
                            dto.currentRent(),
                            dto.exitStrategy(),
                            dto.closingTerms(),
                            null,
                            dto.saleComps()
                    ),
                    property
            );
        }
    }

    private void hydratePhotoAssets(
            Property property,
            Long currentPropertyId,
            PhotoAssetPrincipalRole principalRole,
            long principalId
    ) {
        List<String> photoAssetIds = photoAssetService.collectPhotoAssetIds(property.getPhotos());
        Map<String, PhotoAsset> resolvedAssets = photoAssetService.resolveReadyAssetsOrThrow(
                photoAssetIds,
                currentPropertyId,
                principalRole,
                principalId
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

    private void enqueueInvestorNotificationsIfFirstActivePublish(Property property, PropertyStatus previousStatus) {
        if (property == null || property.getId() == null) return;
        if (property.getStatus() != PropertyStatus.ACTIVE) return;
        if (previousStatus == PropertyStatus.ACTIVE) return;

        propertyPublicationNotificationService.enqueueForFirstPublication(property.getId());
    }

    private Property saveProperty(Property property) {
        validatePhotosBeforeSave(property);
        return propertyRepository.save(property);
    }

    private void validatePhotosBeforeSave(Property property) {
        if (property == null || property.getPhotos() == null || property.getPhotos().isEmpty()) {
            return;
        }

        boolean hasMissingPhotoUrl = property.getPhotos().stream().anyMatch(photo ->
                photo != null
                        && StringUtils.hasText(photo.getPhotoAssetId())
                        && !StringUtils.hasText(photo.getUrl())
        );
        if (hasMissingPhotoUrl) {
            AuthPrincipal authPrincipal = principal();
            hydratePhotoAssets(
                    property,
                    property.getId(),
                    resolvePhotoAssetPrincipalRole(authPrincipal.role()),
                    authPrincipal.userId()
            );
        }

        for (PropertyPhoto photo : property.getPhotos()) {
            if (photo == null) {
                continue;
            }

            photo.setProperty(property);

            if (!StringUtils.hasText(photo.getPhotoAssetId())) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Photo asset id is required for every photo");
            }
            if (!StringUtils.hasText(photo.getUrl())) {
                throw new ResponseStatusException(
                        HttpStatus.BAD_REQUEST,
                        "Cannot save property while photo URL is missing for asset: " + photo.getPhotoAssetId()
                );
            }
            if (!StringUtils.hasText(photo.getThumbnailUrl())) {
                photo.setThumbnailUrl(photo.getUrl());
            }
        }
    }

    private PhotoAssetPrincipalRole resolvePhotoAssetPrincipalRole(String role) {
        if ("ADMIN".equalsIgnoreCase(role)) {
            return PhotoAssetPrincipalRole.ADMIN;
        }
        if ("SELLER".equalsIgnoreCase(role)) {
            return PhotoAssetPrincipalRole.SELLER;
        }
        throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Forbidden");
    }

    private static String normalizeOptionalText(String value) {
        if (value == null) return null;
        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }

    private void validateUniquePhotoAssetIds(List<PropertyPhotoRequestDto> photos) {
        if (photos == null || photos.isEmpty()) return;

        Set<String> seen = new HashSet<>();
        for (PropertyPhotoRequestDto photo : photos) {
            if (photo == null) continue;
            String assetId = photo.photoAssetId();
            if (!StringUtils.hasText(assetId)) continue;
            if (!seen.add(assetId)) {
                throw new ResponseStatusException(
                        HttpStatus.BAD_REQUEST,
                        "Duplicate photoAssetId in photos payload: " + assetId
                );
            }
        }
    }
}

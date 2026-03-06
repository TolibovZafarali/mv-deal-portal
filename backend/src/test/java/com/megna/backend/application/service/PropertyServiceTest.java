package com.megna.backend.application.service;

import com.megna.backend.domain.entity.Property;
import com.megna.backend.domain.entity.PropertyPhoto;
import com.megna.backend.domain.entity.Seller;
import com.megna.backend.domain.enums.ClosingTerms;
import com.megna.backend.domain.enums.ExitStrategy;
import com.megna.backend.domain.enums.OccupancyStatus;
import com.megna.backend.domain.enums.PropertyStatus;
import com.megna.backend.domain.enums.SellerWorkflowStatus;
import com.megna.backend.domain.repository.InvestorRepository;
import com.megna.backend.domain.repository.PropertyRepository;
import com.megna.backend.domain.repository.SellerRepository;
import com.megna.backend.infrastructure.security.AuthPrincipal;
import com.megna.backend.interfaces.rest.dto.property.AdminPropertySellerReviewAction;
import com.megna.backend.interfaces.rest.dto.property.PropertyUpsertRequestDto;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class PropertyServiceTest {

    @Mock
    private PropertyRepository propertyRepository;

    @Mock
    private InvestorRepository investorRepository;

    @Mock
    private SellerRepository sellerRepository;

    @Mock
    private PropertyAddressAutocompleteService propertyAddressAutocompleteService;

    @Mock
    private FmrLookupService fmrLookupService;

    @Mock
    private PhotoAssetService photoAssetService;

    @Mock
    private SellerThreadService sellerThreadService;

    @Mock
    private PropertyPublicationNotificationService propertyPublicationNotificationService;

    @InjectMocks
    private PropertyService propertyService;

    @BeforeEach
    void setUp() {
        lenient().when(propertyRepository.save(any(Property.class))).thenAnswer(invocation -> invocation.getArgument(0));
    }

    @AfterEach
    void clearSecurityContext() {
        SecurityContextHolder.clearContext();
    }

    @Test
    void createSetsFmrFromLookup() {
        when(propertyAddressAutocompleteService.geocode(anyString(), anyString(), anyString(), anyString()))
                .thenReturn(Optional.empty());
        when(fmrLookupService.lookup("62001", 2)).thenReturn(new BigDecimal("990"));

        PropertyUpsertRequestDto dto = dto("62001", 2);
        propertyService.create(dto);

        ArgumentCaptor<Property> savedCaptor = ArgumentCaptor.forClass(Property.class);
        verify(propertyRepository).save(savedCaptor.capture());

        assertEquals(new BigDecimal("990"), savedCaptor.getValue().getFmr());
    }

    @Test
    void updateWithoutZipOrBedsChangeKeepsExistingFmr() {
        Property existing = existingProperty(1L, "62001", 2, new BigDecimal("990"));
        when(propertyRepository.findById(1L)).thenReturn(Optional.of(existing));

        PropertyUpsertRequestDto dto = dto("62001", 2);
        propertyService.update(1L, dto);

        verify(fmrLookupService, never()).lookup(any(), any());
        assertEquals(new BigDecimal("990"), existing.getFmr());
    }

    @Test
    void updateWithZipChangeRecalculatesFmr() {
        Property existing = existingProperty(2L, "62001", 2, new BigDecimal("990"));
        when(propertyRepository.findById(2L)).thenReturn(Optional.of(existing));
        when(propertyAddressAutocompleteService.geocode(anyString(), anyString(), anyString(), anyString()))
                .thenReturn(Optional.empty());
        when(fmrLookupService.lookup("62002", 2)).thenReturn(new BigDecimal("1160"));

        PropertyUpsertRequestDto dto = dto("62002", 2);
        propertyService.update(2L, dto);

        verify(fmrLookupService).lookup("62002", 2);
        assertEquals(new BigDecimal("1160"), existing.getFmr());
    }

    @Test
    void updateWithBedsChangeRecalculatesFmr() {
        Property existing = existingProperty(3L, "62001", 2, new BigDecimal("990"));
        when(propertyRepository.findById(3L)).thenReturn(Optional.of(existing));
        when(fmrLookupService.lookup("62001", 3)).thenReturn(new BigDecimal("1270"));

        PropertyUpsertRequestDto dto = dto("62001", 3);
        propertyService.update(3L, dto);

        verify(fmrLookupService).lookup("62001", 3);
        assertEquals(new BigDecimal("1270"), existing.getFmr());
    }

    @Test
    void updateTransitionToActiveEnqueuesInvestorNotifications() {
        Property existing = activeReadyProperty(21L);
        existing.setStatus(PropertyStatus.DRAFT);
        when(propertyRepository.findById(21L)).thenReturn(Optional.of(existing));

        propertyService.update(21L, activeDto("62001", 3));

        verify(propertyPublicationNotificationService).enqueueForFirstPublication(21L);
    }

    @Test
    void updateAlreadyActiveDoesNotEnqueueInvestorNotifications() {
        Property existing = activeReadyProperty(22L);
        existing.setStatus(PropertyStatus.ACTIVE);
        when(propertyRepository.findById(22L)).thenReturn(Optional.of(existing));

        propertyService.update(22L, activeDto("62001", 3));

        verify(propertyPublicationNotificationService, never()).enqueueForFirstPublication(any());
    }

    @Test
    void updateToActiveRejectsPhotoWithoutUrlBeforeSave() {
        authenticateAsAdmin();

        Property existing = activeReadyProperty(23L);
        existing.setStatus(PropertyStatus.DRAFT);

        PropertyPhoto missingUrlPhoto = new PropertyPhoto();
        missingUrlPhoto.setPhotoAssetId("asset-2");
        missingUrlPhoto.setProperty(existing);
        missingUrlPhoto.setUrl(null);

        ArrayList<PropertyPhoto> photos = new ArrayList<>(existing.getPhotos());
        photos.add(missingUrlPhoto);
        existing.setPhotos(photos);

        when(propertyRepository.findById(23L)).thenReturn(Optional.of(existing));

        ResponseStatusException ex = assertThrows(ResponseStatusException.class, () ->
                propertyService.update(23L, activeDto("62001", 3))
        );

        assertEquals(HttpStatus.BAD_REQUEST, ex.getStatusCode());
        assertEquals("Cannot save property while photo URL is missing for asset: asset-2", ex.getReason());
        verify(propertyRepository, never()).save(existing);
    }

    @Test
    void reviewSellerPropertyApproveEnqueuesInvestorNotifications() {
        authenticateAsAdmin();

        Property property = activeReadyProperty(30L);
        property.setStatus(PropertyStatus.DRAFT);
        property.setSellerWorkflowStatus(SellerWorkflowStatus.SUBMITTED);
        property.setSeller(seller(99L));

        when(propertyRepository.findById(30L)).thenReturn(Optional.of(property));

        propertyService.reviewSellerProperty(30L, AdminPropertySellerReviewAction.PUBLISH, "Looks good");

        verify(propertyPublicationNotificationService).enqueueForFirstPublication(30L);
    }

    @Test
    void assignSellerShouldBlockUnassigningCreatorSeller() {
        authenticateAsAdmin();

        Seller creator = seller(10L);
        Property property = existingProperty(10L, "62001", 3, new BigDecimal("990"));
        property.setSeller(creator);
        property.setCreatedBySeller(creator);
        when(propertyRepository.findById(10L)).thenReturn(Optional.of(property));

        ResponseStatusException ex = assertThrows(ResponseStatusException.class, () ->
                propertyService.assignSeller(10L, null)
        );

        assertEquals(HttpStatus.CONFLICT, ex.getStatusCode());
        assertEquals("Cannot unassign the seller who originally created this property", ex.getReason());
        verify(propertyRepository, never()).save(property);
    }

    @Test
    void assignSellerShouldAllowUnassigningNonCreatorSeller() {
        authenticateAsAdmin();

        Seller creator = seller(10L);
        Seller assignedSeller = seller(11L);
        Property property = existingProperty(11L, "62001", 3, new BigDecimal("990"));
        property.setSeller(assignedSeller);
        property.setCreatedBySeller(creator);
        when(propertyRepository.findById(11L)).thenReturn(Optional.of(property));

        propertyService.assignSeller(11L, null);

        assertNull(property.getSeller());
        assertEquals(10L, property.getCreatedBySeller().getId());
        verify(propertyRepository).save(property);
    }

    @Test
    void searchWithOutOfRangeMinAskingPriceReturnsBadRequest() {
        authenticateAsAdmin();

        ResponseStatusException ex = assertThrows(ResponseStatusException.class, () ->
                propertyService.search(
                        null,
                        null,
                        null,
                        null,
                        null,
                        null,
                        null,
                        new BigDecimal("10000000000"),
                        null,
                        null,
                        null,
                        null,
                        null,
                        null,
                        null,
                        Pageable.unpaged()
                )
        );

        assertEquals(HttpStatus.BAD_REQUEST, ex.getStatusCode());
        assertEquals(
                "minAskingPrice must be between 0 and 9999999999.99",
                ex.getReason()
        );
        verify(propertyRepository, never()).findAll(any(org.springframework.data.jpa.domain.Specification.class), any(Pageable.class));
    }

    private static void authenticateAsAdmin() {
        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken(
                        new AuthPrincipal("admin@test.local", 1L, "ADMIN"),
                        null
                )
        );
    }

    private static Property existingProperty(Long id, String zip, Integer beds, BigDecimal fmr) {
        Property property = new Property();
        property.setId(id);
        property.setStatus(PropertyStatus.DRAFT);
        property.setZip(zip);
        property.setBeds(beds);
        property.setFmr(fmr);
        property.setLatitude(new BigDecimal("38.6270"));
        property.setLongitude(new BigDecimal("-90.1994"));
        return property;
    }

    private static Seller seller(Long id) {
        Seller seller = new Seller();
        seller.setId(id);
        return seller;
    }

    private static PropertyUpsertRequestDto dto(String zip, Integer beds) {
        return new PropertyUpsertRequestDto(
                PropertyStatus.DRAFT,
                null,
                null,
                null,
                null,
                zip,
                null,
                null,
                null,
                beds,
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
        );
    }

    private static PropertyUpsertRequestDto activeDto(String zip, Integer beds) {
        return new PropertyUpsertRequestDto(
                PropertyStatus.ACTIVE,
                "123 Main St",
                null,
                "St Louis",
                "MO",
                zip,
                new BigDecimal("120000"),
                new BigDecimal("185000"),
                new BigDecimal("25000"),
                beds,
                new BigDecimal("2.0"),
                1200,
                1988,
                8,
                5,
                OccupancyStatus.NO,
                null,
                ExitStrategy.FLIP,
                ClosingTerms.CASH_ONLY,
                null,
                null
        );
    }

    private static Property activeReadyProperty(Long id) {
        Property property = existingProperty(id, "62001", 3, new BigDecimal("990"));
        property.setStreet1("123 Main St");
        property.setCity("St Louis");
        property.setState("MO");
        property.setAskingPrice(new BigDecimal("120000"));
        property.setArv(new BigDecimal("185000"));
        property.setEstRepairs(new BigDecimal("25000"));
        property.setBaths(new BigDecimal("2.0"));
        property.setLivingAreaSqft(1200);
        property.setYearBuilt(1988);
        property.setOccupancyStatus(OccupancyStatus.NO);
        property.setExitStrategy(ExitStrategy.FLIP);
        property.setClosingTerms(ClosingTerms.CASH_ONLY);

        PropertyPhoto photo = new PropertyPhoto();
        photo.setPhotoAssetId("asset-1");
        photo.setUrl("https://example.com/photo.jpg");
        photo.setProperty(property);
        property.setPhotos(java.util.List.of(photo));
        return property;
    }
}

package com.megna.backend.application.service;

import com.megna.backend.domain.entity.Property;
import com.megna.backend.domain.enums.PropertyStatus;
import com.megna.backend.domain.repository.AdminRepository;
import com.megna.backend.domain.repository.InvestorRepository;
import com.megna.backend.domain.repository.PropertyChangeRequestRepository;
import com.megna.backend.domain.repository.PropertyRepository;
import com.megna.backend.domain.repository.SellerRepository;
import com.megna.backend.infrastructure.security.AuthPrincipal;
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
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
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
    private AdminRepository adminRepository;

    @Mock
    private PropertyChangeRequestRepository propertyChangeRequestRepository;

    @Mock
    private PropertyAddressAutocompleteService propertyAddressAutocompleteService;

    @Mock
    private FmrLookupService fmrLookupService;

    @Mock
    private PhotoAssetService photoAssetService;

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

        PropertyUpsertRequestDto dto = dto("Create Test", "62001", 2);
        propertyService.create(dto);

        ArgumentCaptor<Property> savedCaptor = ArgumentCaptor.forClass(Property.class);
        verify(propertyRepository).save(savedCaptor.capture());

        assertEquals(new BigDecimal("990"), savedCaptor.getValue().getFmr());
    }

    @Test
    void updateWithoutZipOrBedsChangeKeepsExistingFmr() {
        Property existing = existingProperty(1L, "62001", 2, new BigDecimal("990"));
        when(propertyRepository.findById(1L)).thenReturn(Optional.of(existing));

        PropertyUpsertRequestDto dto = dto("Updated Title", "62001", 2);
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

        PropertyUpsertRequestDto dto = dto("Zip Change", "62002", 2);
        propertyService.update(2L, dto);

        verify(fmrLookupService).lookup("62002", 2);
        assertEquals(new BigDecimal("1160"), existing.getFmr());
    }

    @Test
    void updateWithBedsChangeRecalculatesFmr() {
        Property existing = existingProperty(3L, "62001", 2, new BigDecimal("990"));
        when(propertyRepository.findById(3L)).thenReturn(Optional.of(existing));
        when(fmrLookupService.lookup("62001", 3)).thenReturn(new BigDecimal("1270"));

        PropertyUpsertRequestDto dto = dto("Beds Change", "62001", 3);
        propertyService.update(3L, dto);

        verify(fmrLookupService).lookup("62001", 3);
        assertEquals(new BigDecimal("1270"), existing.getFmr());
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
        property.setTitle("Existing");
        property.setZip(zip);
        property.setBeds(beds);
        property.setFmr(fmr);
        property.setLatitude(new BigDecimal("38.6270"));
        property.setLongitude(new BigDecimal("-90.1994"));
        return property;
    }

    private static PropertyUpsertRequestDto dto(String title, String zip, Integer beds) {
        return new PropertyUpsertRequestDto(
                PropertyStatus.DRAFT,
                title,
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
}

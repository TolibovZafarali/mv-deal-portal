package com.megna.backend.interfaces.rest.controller;

import com.megna.backend.interfaces.rest.dto.property.PropertyPhotoUploadCompleteRequestDto;
import com.megna.backend.interfaces.rest.dto.property.PropertyPhotoUploadCompleteResponseDto;
import com.megna.backend.interfaces.rest.dto.property.PropertyPhotoUploadInitRequestDto;
import com.megna.backend.interfaces.rest.dto.property.PropertyPhotoUploadInitResponseDto;
import com.megna.backend.interfaces.rest.dto.property.PropertyAddressSuggestionResponseDto;
import com.megna.backend.interfaces.rest.dto.property.PropertyResponseDto;
import com.megna.backend.interfaces.rest.dto.property.PropertyUpsertRequestDto;
import com.megna.backend.domain.enums.ClosingTerms;
import com.megna.backend.domain.enums.ExitStrategy;
import com.megna.backend.domain.enums.OccupancyStatus;
import com.megna.backend.domain.enums.PropertyStatus;
import com.megna.backend.domain.enums.SellerWorkflowStatus;
import com.megna.backend.application.service.PropertyAddressAutocompleteService;
import com.megna.backend.application.service.PhotoAssetService;
import com.megna.backend.application.service.PropertyService;
import com.megna.backend.infrastructure.security.SecurityUtils;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.List;

@RestController
@RequestMapping("/api/properties")
@RequiredArgsConstructor
public class PropertyController {

    private final PropertyService propertyService;
    private final PhotoAssetService photoAssetService;
    private final PropertyAddressAutocompleteService propertyAddressAutocompleteService;

    @PreAuthorize("hasRole('ADMIN')")
    @PostMapping
    public ResponseEntity<PropertyResponseDto> create(@Valid @RequestBody PropertyUpsertRequestDto dto) {
        PropertyResponseDto created = propertyService.create(dto);
        return ResponseEntity.status(HttpStatus.CREATED).body(created);
    }

    @GetMapping("/{id}")
    public PropertyResponseDto getById(@PathVariable Long id) {
        return propertyService.getById(id);
    }

    @GetMapping
    public Page<PropertyResponseDto> getAll(
            @PageableDefault(size = 20, sort = "createdAt", direction = Sort.Direction.DESC) Pageable pageable
    ) {
        return propertyService.getAll(pageable);
    }

    @PreAuthorize("hasRole('ADMIN')")
    @PutMapping("/{id}")
    public PropertyResponseDto update(@PathVariable Long id, @Valid @RequestBody PropertyUpsertRequestDto dto) {
        return propertyService.update(id, dto);
    }

    @PreAuthorize("hasRole('ADMIN')")
    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable Long id) {
        propertyService.delete(id);
    }

    @PreAuthorize("hasRole('ADMIN')")
    @PostMapping("/photos/uploads/init")
    public ResponseEntity<PropertyPhotoUploadInitResponseDto> initPhotoUpload(
            @Valid @RequestBody PropertyPhotoUploadInitRequestDto dto
    ) {
        long adminId = SecurityUtils.requirePrincipal().userId();
        PropertyPhotoUploadInitResponseDto uploaded = photoAssetService.initUpload(dto, adminId);
        return ResponseEntity.status(HttpStatus.CREATED).body(uploaded);
    }

    @PreAuthorize("hasRole('ADMIN')")
    @PostMapping("/photos/uploads/{uploadId}/complete")
    public ResponseEntity<PropertyPhotoUploadCompleteResponseDto> completePhotoUpload(
            @PathVariable String uploadId,
            @Valid @RequestBody PropertyPhotoUploadCompleteRequestDto dto
    ) {
        long adminId = SecurityUtils.requirePrincipal().userId();
        PropertyPhotoUploadCompleteResponseDto completed = photoAssetService.completeUpload(uploadId, dto, adminId);
        return ResponseEntity.ok(completed);
    }

    @PreAuthorize("hasRole('ADMIN')")
    @DeleteMapping("/photos/uploads/{uploadId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteUnboundPhotoUpload(@PathVariable String uploadId) {
        long adminId = SecurityUtils.requirePrincipal().userId();
        photoAssetService.deleteUnboundUpload(uploadId, adminId);
    }

    @PreAuthorize("hasRole('ADMIN')")
    @GetMapping("/address-suggestions")
    public List<PropertyAddressSuggestionResponseDto> addressSuggestions(
            @RequestParam(name = "q") String query,
            @RequestParam(required = false) Integer limit
    ) {
        return propertyAddressAutocompleteService.search(query, limit);
    }

    @GetMapping("/search")
    public Page<PropertyResponseDto> search(
            @RequestParam(required = false) PropertyStatus status,
            @RequestParam(required = false, name = "q") String query,
            @RequestParam(required = false) String city,
            @RequestParam(required = false) String state,
            @RequestParam(required = false) Integer minBeds,
            @RequestParam(required = false) Integer maxBeds,
            @RequestParam(required = false) BigDecimal minBaths,
            @RequestParam(required = false) BigDecimal minAskingPrice,
            @RequestParam(required = false) BigDecimal maxAskingPrice,
            @RequestParam(required = false) BigDecimal minArv,
            @RequestParam(required = false) BigDecimal maxArv,
            @RequestParam(required = false) OccupancyStatus occupancyStatus,
            @RequestParam(required = false) ExitStrategy exitStrategy,
            @RequestParam(required = false) ClosingTerms closingTerms,
            @RequestParam(required = false) SellerWorkflowStatus sellerWorkflowStatus,
            @PageableDefault(size = 20, sort = "createdAt", direction = Sort.Direction.DESC) Pageable pageable
            ) {
        return propertyService.search(
                status, query, city, state,
                minBeds, maxBeds, minBaths,
                minAskingPrice, maxAskingPrice,
                minArv, maxArv,
                occupancyStatus, exitStrategy, closingTerms, sellerWorkflowStatus,
                pageable
        );
    }
}

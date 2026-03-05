package com.megna.backend.interfaces.rest.controller;

import com.megna.backend.application.service.PropertyService;
import com.megna.backend.application.service.PhotoAssetService;
import com.megna.backend.infrastructure.security.SecurityUtils;
import com.megna.backend.infrastructure.security.AuthPrincipal;
import com.megna.backend.interfaces.rest.dto.property.PropertyPhotoUploadCompleteRequestDto;
import com.megna.backend.interfaces.rest.dto.property.PropertyPhotoUploadCompleteResponseDto;
import com.megna.backend.interfaces.rest.dto.property.PropertyPhotoUploadInitRequestDto;
import com.megna.backend.interfaces.rest.dto.property.PropertyPhotoUploadInitResponseDto;
import com.megna.backend.interfaces.rest.dto.property.PropertyPhotoUrlCreateRequestDto;
import com.megna.backend.interfaces.rest.dto.property.PropertyResponseDto;
import com.megna.backend.interfaces.rest.dto.property.SellerPropertyDraftUpsertRequestDto;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/api/seller/properties")
@RequiredArgsConstructor
public class SellerPropertyController {

    private final PropertyService propertyService;
    private final PhotoAssetService photoAssetService;

    @GetMapping
    public Page<PropertyResponseDto> getMine(
            @PageableDefault(size = 20, sort = "createdAt", direction = Sort.Direction.DESC) Pageable pageable
    ) {
        long sellerId = requireSellerId();
        return propertyService.getSellerProperties(sellerId, pageable);
    }

    @GetMapping("/{id}")
    public PropertyResponseDto getOne(@PathVariable Long id) {
        long sellerId = requireSellerId();
        return propertyService.getSellerPropertyById(sellerId, id);
    }

    @PostMapping
    public ResponseEntity<PropertyResponseDto> create(@Valid @RequestBody SellerPropertyDraftUpsertRequestDto dto) {
        long sellerId = requireSellerId();
        PropertyResponseDto created = propertyService.createBySeller(sellerId, dto);
        return ResponseEntity.status(HttpStatus.CREATED).body(created);
    }

    @PutMapping("/{id}")
    public PropertyResponseDto update(@PathVariable Long id, @Valid @RequestBody SellerPropertyDraftUpsertRequestDto dto) {
        long sellerId = requireSellerId();
        return propertyService.updateBySeller(sellerId, id, dto);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable Long id) {
        long sellerId = requireSellerId();
        propertyService.deleteBySeller(sellerId, id);
    }

    @PostMapping("/{id}/submit")
    public PropertyResponseDto submit(@PathVariable Long id) {
        long sellerId = requireSellerId();
        return propertyService.submitBySeller(sellerId, id);
    }

    @PostMapping("/photos/uploads/init")
    public ResponseEntity<PropertyPhotoUploadInitResponseDto> initPhotoUpload(
            @Valid @RequestBody PropertyPhotoUploadInitRequestDto dto
    ) {
        long sellerId = requireSellerId();
        PropertyPhotoUploadInitResponseDto response = photoAssetService.initUploadForSeller(dto, sellerId);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @PostMapping("/photos/uploads/{uploadId}/complete")
    public ResponseEntity<PropertyPhotoUploadCompleteResponseDto> completePhotoUpload(
            @PathVariable String uploadId,
            @Valid @RequestBody PropertyPhotoUploadCompleteRequestDto dto
    ) {
        long sellerId = requireSellerId();
        PropertyPhotoUploadCompleteResponseDto response = photoAssetService.completeUploadForSeller(uploadId, dto, sellerId);
        return ResponseEntity.ok(response);
    }

    @PostMapping("/photos/urls")
    public ResponseEntity<PropertyPhotoUploadCompleteResponseDto> createPhotoFromUrl(
            @Valid @RequestBody PropertyPhotoUrlCreateRequestDto dto
    ) {
        long sellerId = requireSellerId();
        PropertyPhotoUploadCompleteResponseDto created = photoAssetService.createFromUrlForSeller(dto.url(), sellerId);
        return ResponseEntity.status(HttpStatus.CREATED).body(created);
    }

    @DeleteMapping("/photos/uploads/{uploadId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteUnboundPhotoUpload(@PathVariable String uploadId) {
        long sellerId = requireSellerId();
        photoAssetService.deleteUnboundUploadForSeller(uploadId, sellerId);
    }

    private long requireSellerId() {
        AuthPrincipal principal = SecurityUtils.requirePrincipal();
        if (!"SELLER".equalsIgnoreCase(principal.role())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Forbidden");
        }
        return principal.userId();
    }
}

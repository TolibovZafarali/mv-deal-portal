package com.megna.backend.interfaces.rest.controller;

import com.megna.backend.application.service.PropertyService;
import com.megna.backend.infrastructure.security.SecurityUtils;
import com.megna.backend.interfaces.rest.dto.property.PropertyChangeRequestCreateRequestDto;
import com.megna.backend.interfaces.rest.dto.property.PropertyChangeRequestResponseDto;
import com.megna.backend.interfaces.rest.dto.property.PropertyResponseDto;
import com.megna.backend.interfaces.rest.dto.property.PropertyUpsertRequestDto;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/seller/properties")
@RequiredArgsConstructor
public class SellerPropertyController {

    private final PropertyService propertyService;

    @GetMapping
    public Page<PropertyResponseDto> getMine(
            @PageableDefault(size = 20, sort = "createdAt", direction = Sort.Direction.DESC) Pageable pageable
    ) {
        long sellerId = SecurityUtils.requirePrincipal().userId();
        return propertyService.getSellerProperties(sellerId, pageable);
    }

    @GetMapping("/{id}")
    public PropertyResponseDto getOne(@PathVariable Long id) {
        long sellerId = SecurityUtils.requirePrincipal().userId();
        return propertyService.getSellerPropertyById(sellerId, id);
    }

    @PostMapping
    public ResponseEntity<PropertyResponseDto> create(@Valid @RequestBody PropertyUpsertRequestDto dto) {
        long sellerId = SecurityUtils.requirePrincipal().userId();
        PropertyResponseDto created = propertyService.createBySeller(sellerId, dto);
        return ResponseEntity.status(HttpStatus.CREATED).body(created);
    }

    @PutMapping("/{id}")
    public PropertyResponseDto update(@PathVariable Long id, @Valid @RequestBody PropertyUpsertRequestDto dto) {
        long sellerId = SecurityUtils.requirePrincipal().userId();
        return propertyService.updateBySeller(sellerId, id, dto);
    }

    @PostMapping("/{id}/submit")
    public PropertyResponseDto submit(@PathVariable Long id) {
        long sellerId = SecurityUtils.requirePrincipal().userId();
        return propertyService.submitBySeller(sellerId, id);
    }

    @PostMapping("/{id}/change-requests")
    public ResponseEntity<PropertyChangeRequestResponseDto> createChangeRequest(
            @PathVariable Long id,
            @Valid @RequestBody PropertyChangeRequestCreateRequestDto dto
    ) {
        long sellerId = SecurityUtils.requirePrincipal().userId();
        PropertyChangeRequestResponseDto created = propertyService.createChangeRequestBySeller(
                sellerId,
                id,
                dto.requestedChanges()
        );
        return ResponseEntity.status(HttpStatus.CREATED).body(created);
    }

    @GetMapping("/change-requests")
    public Page<PropertyChangeRequestResponseDto> getMyChangeRequests(
            @PageableDefault(size = 20, sort = "createdAt", direction = Sort.Direction.DESC) Pageable pageable
    ) {
        long sellerId = SecurityUtils.requirePrincipal().userId();
        return propertyService.getSellerChangeRequests(sellerId, pageable);
    }
}

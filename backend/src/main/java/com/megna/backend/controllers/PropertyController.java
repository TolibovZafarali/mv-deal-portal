package com.megna.backend.controllers;

import com.megna.backend.dtos.property.PropertyResponseDto;
import com.megna.backend.dtos.property.PropertyUpsertRequestDto;
import com.megna.backend.enums.ExitStrategy;
import com.megna.backend.enums.OccupancyStatus;
import com.megna.backend.enums.PropertyStatus;
import com.megna.backend.services.PropertyService;
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

@RestController
@RequestMapping("/api/properties")
@RequiredArgsConstructor
public class PropertyController {

    private final PropertyService propertyService;

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

    @GetMapping("/search")
    public Page<PropertyResponseDto> search(
            @RequestParam(required = false) PropertyStatus status,
            @RequestParam(required = false) String city,
            @RequestParam(required = false) String state,
            @RequestParam(required = false) Integer minBeds,
            @RequestParam(required = false) Integer maxBeds,
            @RequestParam(required = false) BigDecimal minAskingPrice,
            @RequestParam(required = false) BigDecimal maxAskingPrice,
            @RequestParam(required = false) BigDecimal minArv,
            @RequestParam(required = false) BigDecimal maxArv,
            @RequestParam(required = false) OccupancyStatus occupancyStatus,
            @RequestParam(required = false) ExitStrategy exitStrategy,
            @PageableDefault(size = 20, sort = "createdAt", direction = Sort.Direction.DESC) Pageable pageable
            ) {
        return propertyService.search(
                status, city, state,
                minBeds, maxBeds,
                minAskingPrice, maxAskingPrice,
                minArv, maxArv,
                occupancyStatus, exitStrategy,
                pageable
        );
    }
}

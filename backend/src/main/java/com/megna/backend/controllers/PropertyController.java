package com.megna.backend.controllers;

import com.megna.backend.dtos.property.PropertyResponseDto;
import com.megna.backend.dtos.property.PropertyUpsertRequestDto;
import com.megna.backend.services.PropertyService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/properties")
@RequiredArgsConstructor
public class PropertyController {

    private final PropertyService propertyService;

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
    public List<PropertyResponseDto> getAll() {
        return propertyService.getAll();
    }

    @PutMapping("/{id}")
    public PropertyResponseDto update(@PathVariable Long id, @Valid @RequestBody PropertyUpsertRequestDto dto) {
        return propertyService.update(id, dto);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable Long id) {
        propertyService.delete(id);
    }
}

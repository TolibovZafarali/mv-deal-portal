package com.megna.backend.controllers;

import com.megna.backend.dtos.inquiry.InquiryCreateRequestDto;
import com.megna.backend.dtos.inquiry.InquiryResponseDto;
import com.megna.backend.entities.Inquiry;
import com.megna.backend.services.InquiryService;
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

import java.util.List;

@RestController
@RequestMapping("/api/inquiries")
@RequiredArgsConstructor
public class InquiryController {

    private final InquiryService inquiryService;

    @PostMapping
    public ResponseEntity<InquiryResponseDto> create(@Valid @RequestBody InquiryCreateRequestDto dto) {
        InquiryResponseDto created = inquiryService.create(dto);
        return ResponseEntity.status(HttpStatus.CREATED).body(created);
    }

    @GetMapping("/{id}")
    public InquiryResponseDto getById(@PathVariable Long id) {
        return inquiryService.getById(id);
    }

    @PreAuthorize("hasRole('ADMIN')")
    @GetMapping
    public Page<InquiryResponseDto> getAll(
            @PageableDefault(size = 20, sort = "createdAt", direction = Sort.Direction.DESC) Pageable pageable
            ) {
        return inquiryService.getAll(pageable);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable Long id) {
        inquiryService.delete(id);
    }

    @PreAuthorize("hasRole('ADMIN')")
    @GetMapping("/by-property/{propertyId}")
    public Page<InquiryResponseDto> getByPropertyId(
            @PathVariable Long propertyId,
            @PageableDefault(size = 20, sort = "createdAt", direction = Sort.Direction.DESC) Pageable pageable
            ) {
        return inquiryService.getByPropertyId(propertyId, pageable);
    }

    @GetMapping("/by-investor/{investorId}")
    public Page<InquiryResponseDto> getByInvestorId(
            @PathVariable Long investorId,
            @PageableDefault(size = 20, sort = "createdAt", direction = Sort.Direction.DESC) Pageable pageable
            ) {
        return inquiryService.getByInvestorId(investorId, pageable);
    }
}

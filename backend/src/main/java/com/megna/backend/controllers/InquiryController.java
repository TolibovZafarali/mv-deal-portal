package com.megna.backend.controllers;

import com.megna.backend.dtos.inquiry.InquiryCreateRequestDto;
import com.megna.backend.dtos.inquiry.InquiryResponseDto;
import com.megna.backend.entities.Inquiry;
import com.megna.backend.services.InquiryService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
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

    @GetMapping
    public List<InquiryResponseDto> getAll() {
        return inquiryService.getAll();
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable Long id) {
        inquiryService.delete(id);
    }

    @GetMapping("/by-property/{propertyId}")
    public List<InquiryResponseDto> getByPropertyId(@PathVariable Long propertyId) {
        return inquiryService.getByPropertyId(propertyId);
    }

    @GetMapping("/by-investor/{investorId}")
    public List<InquiryResponseDto> getByInvestorId(@PathVariable Long investorId) {
        return inquiryService.getByInvestorId(investorId);
    }
}

package com.megna.backend.controllers;

import com.megna.backend.dtos.investor.InvestorCreateRequestDto;
import com.megna.backend.dtos.investor.InvestorResponseDto;
import com.megna.backend.dtos.investor.InvestorStatusUpdateRequestDto;
import com.megna.backend.dtos.investor.InvestorUpdateRequestDto;
import com.megna.backend.services.InvestorService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/investors")
@RequiredArgsConstructor
public class InvestorController {

    private final InvestorService investorService;

    @PostMapping
    public ResponseEntity<InvestorResponseDto> create(@Valid @RequestBody InvestorCreateRequestDto dto) {
        InvestorResponseDto created = investorService.create(dto);
        return ResponseEntity.status(HttpStatus.CREATED).body(created);
    }

    @GetMapping("/{id}")
    public InvestorResponseDto getById(@PathVariable Long id) {
        return investorService.getById(id);
    }

    @GetMapping
    public List<InvestorResponseDto> getAll() {
        return investorService.getAll();
    }

    @PutMapping("/{id}")
    public InvestorResponseDto update(@PathVariable Long id, @Valid @RequestBody InvestorUpdateRequestDto dto) {
        return investorService.update(id, dto);
    }

    @PatchMapping("/{id}/status")
    public InvestorResponseDto updateStatus(@PathVariable Long id, @Valid @RequestBody InvestorStatusUpdateRequestDto dto) {
        return investorService.updateStatus(id, dto);
    }

    @GetMapping("/by-email")
    public InvestorResponseDto getByEmail(@RequestParam String email) {
        return investorService.getByEmail(email);
    }
}

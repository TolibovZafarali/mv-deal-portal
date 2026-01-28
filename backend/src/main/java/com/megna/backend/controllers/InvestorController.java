package com.megna.backend.controllers;

import com.megna.backend.dtos.investor.InvestorCreateRequestDto;
import com.megna.backend.dtos.investor.InvestorResponseDto;
import com.megna.backend.dtos.investor.InvestorStatusUpdateRequestDto;
import com.megna.backend.dtos.investor.InvestorUpdateRequestDto;
import com.megna.backend.entities.Investor;
import com.megna.backend.mappers.InvestorMapper;
import com.megna.backend.repositories.InvestorRepository;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

@RestController
@RequestMapping("/api/investors")
@RequiredArgsConstructor
public class InvestorController {

    private final InvestorRepository investorRepository;

    @PostMapping
    public ResponseEntity<InvestorResponseDto> create(@Valid @RequestBody InvestorCreateRequestDto dto) {
        // TODO: hash password before persisting (currently mapper puts raw password into passwordHash)
        Investor investor = InvestorMapper.toEntity(dto);
        Investor saved = investorRepository.save(investor);
        return ResponseEntity.status(HttpStatus.CREATED).body(InvestorMapper.toDto(saved));
    }

    @GetMapping("/{id}")
    public InvestorResponseDto getById(@PathVariable Long id) {
        Investor investor = investorRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Investor not found: " + id));
        return InvestorMapper.toDto(investor);
    }

    @GetMapping
    public List<InvestorResponseDto> getAll() {
        return investorRepository.findAll().stream()
                .map(InvestorMapper::toDto)
                .toList();
    }

    @PutMapping("/{id}")
    public InvestorResponseDto update(@PathVariable Long id, @Valid @RequestBody InvestorUpdateRequestDto dto) {
        Investor investor = investorRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Investor not found: " + id));

        InvestorMapper.applyUpdate(dto, investor);

        Investor saved = investorRepository.save(investor);
        return InvestorMapper.toDto(saved);
    }

    @PatchMapping("/{id}/status")
    public InvestorResponseDto updateStatus(@PathVariable Long id, @Valid @RequestBody InvestorStatusUpdateRequestDto dto) {
        Investor investor = investorRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Investor not found: " + id));

        InvestorMapper.applyStatusUpdate(dto, investor);

        Investor saved = investorRepository.save(investor);
        return InvestorMapper.toDto(saved);
    }
}

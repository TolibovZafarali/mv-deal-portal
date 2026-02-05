package com.megna.backend.controllers;

import com.megna.backend.dtos.investor.InvestorResponseDto;
import com.megna.backend.dtos.investor.InvestorStatusUpdateRequestDto;
import com.megna.backend.dtos.investor.InvestorUpdateRequestDto;
import com.megna.backend.enums.InvestorStatus;
import com.megna.backend.services.InvestorService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/investors")
@RequiredArgsConstructor
public class InvestorController {

    private final InvestorService investorService;

    @GetMapping("/{id}")
    public InvestorResponseDto getById(@PathVariable Long id) {
        return investorService.getById(id);
    }

    @PreAuthorize("hasRole('ADMIN')")
    @GetMapping
    public Page<InvestorResponseDto> getAll(
            @PageableDefault(size = 20, sort = "createdAt", direction = Sort.Direction.DESC) Pageable pageable
            ) {
        return investorService.getAll(pageable);
    }

    @PutMapping("/{id}")
    public InvestorResponseDto update(@PathVariable Long id, @Valid @RequestBody InvestorUpdateRequestDto dto) {
        return investorService.update(id, dto);
    }

    @PreAuthorize("hasRole('ADMIN')")
    @PatchMapping("/{id}/status")
    public InvestorResponseDto updateStatus(@PathVariable Long id, @Valid @RequestBody InvestorStatusUpdateRequestDto dto) {
        return investorService.updateStatus(id, dto);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable Long id) {
        investorService.delete(id);
    }

    @PreAuthorize("hasRole('ADMIN')")
    @GetMapping("/by-email")
    public InvestorResponseDto getByEmail(@RequestParam String email) {
        return investorService.getByEmail(email);
    }

    @PreAuthorize("hasRole('ADMIN')")
    @GetMapping("/search")
    public Page<InvestorResponseDto> search(
            @RequestParam(required = false) InvestorStatus status,
            @RequestParam(required = false) String email,
            @RequestParam(required = false) String companyName,
            @RequestParam(required = false) String name,
            @PageableDefault(size = 20, sort = "createdAt", direction = Sort.Direction.DESC) Pageable pageable
            ) {
        return investorService.search(status, email, companyName, name, pageable);
    }
}

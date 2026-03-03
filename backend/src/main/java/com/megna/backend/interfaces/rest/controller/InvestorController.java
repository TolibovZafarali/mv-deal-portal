package com.megna.backend.interfaces.rest.controller;

import com.megna.backend.interfaces.rest.dto.investor.InvestorResponseDto;
import com.megna.backend.interfaces.rest.dto.investor.InvestorStatusUpdateRequestDto;
import com.megna.backend.interfaces.rest.dto.investor.InvestorUpdateRequestDto;
import com.megna.backend.domain.enums.InvestorStatus;
import com.megna.backend.application.service.InvestorFavoriteService;
import com.megna.backend.application.service.InvestorService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.HttpStatus;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.List;

@RestController
@RequestMapping("/api/investors")
@RequiredArgsConstructor
public class InvestorController {

    private final InvestorService investorService;
    private final InvestorFavoriteService investorFavoriteService;

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

    @GetMapping("/{id}/favorites")
    public List<Long> getFavoritePropertyIds(@PathVariable Long id) {
        return investorFavoriteService.getFavoritePropertyIds(id);
    }

    @PutMapping("/{id}/favorites/{propertyId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void addFavoriteProperty(@PathVariable Long id, @PathVariable Long propertyId) {
        investorFavoriteService.addFavorite(id, propertyId);
    }

    @DeleteMapping("/{id}/favorites/{propertyId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void removeFavoriteProperty(@PathVariable Long id, @PathVariable Long propertyId) {
        investorFavoriteService.removeFavorite(id, propertyId);
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
            @RequestParam(required = false) String q,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime createdFrom,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime createdTo,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime updatedFrom,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime updatedTo,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime approvedFrom,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime approvedTo,
            @PageableDefault(size = 20, sort = "createdAt", direction = Sort.Direction.DESC) Pageable pageable
            ) {
        return investorService.search(status, q, createdFrom, createdTo, updatedFrom, updatedTo, approvedFrom, approvedTo, pageable);
    }
}

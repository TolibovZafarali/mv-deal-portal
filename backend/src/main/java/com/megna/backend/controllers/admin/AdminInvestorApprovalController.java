package com.megna.backend.controllers.admin;

import com.megna.backend.dtos.investor.InvestorRejectionRequestDto;
import com.megna.backend.dtos.investor.InvestorResponseDto;
import com.megna.backend.dtos.investor.InvestorStatusUpdateRequestDto;
import com.megna.backend.enums.InvestorStatus;
import com.megna.backend.services.InvestorService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;

@RestController
@RequestMapping("/api/admin/investors")
@RequiredArgsConstructor
@PreAuthorize("hasRole('ADMIN')")
public class AdminInvestorApprovalController {

    private final InvestorService investorService;

    @GetMapping("/pending")
    public Page<InvestorResponseDto> getPending(
            @PageableDefault(size = 20, sort = "createdAt", direction = Sort.Direction.DESC) Pageable pageable
            ) {
        return investorService.search(InvestorStatus.PENDING, null, null, null, null, null, null, null, pageable);
    }

    @PatchMapping("/{id}/approve")
    public InvestorResponseDto approve(@PathVariable Long id) {
        return investorService.updateStatus(id, new InvestorStatusUpdateRequestDto(InvestorStatus.APPROVED));
    }

    @PatchMapping("/{id}/reject")
    public InvestorResponseDto reject(@PathVariable Long id, @Valid @RequestBody InvestorRejectionRequestDto dto) {
        return investorService.reject(id, dto);
    }

    @GetMapping("/{id}")
    public InvestorResponseDto getOne(@PathVariable Long id) {
        return investorService.getById(id);
    }

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

    @PatchMapping("/{id}/rejection-reason")
    public InvestorResponseDto updateRejectionReason(@PathVariable Long id, @Valid @RequestBody InvestorRejectionRequestDto dto) {
        return investorService.updateRejectionReason(id, dto);
    }

    @GetMapping("/approved")
    public Page<InvestorResponseDto> getApproved(
            @PageableDefault(size = 20, sort = "approvedAt", direction = Sort.Direction.DESC) Pageable pageable
    ) {
        return investorService.search(InvestorStatus.APPROVED, null, null, null, null, null, null, null, pageable);
    }

    @GetMapping("/rejected")
    public Page<InvestorResponseDto> getRejected(
            @PageableDefault(size = 20, sort = "updatedAt", direction = Sort.Direction.DESC) Pageable pageable
    ) {
        return investorService.search(InvestorStatus.REJECTED, null, null, null, null, null, null, null, pageable);
    }
}

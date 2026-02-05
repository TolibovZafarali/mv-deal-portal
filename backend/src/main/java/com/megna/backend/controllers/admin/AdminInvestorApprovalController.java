package com.megna.backend.controllers.admin;

import com.megna.backend.dtos.investor.InvestorResponseDto;
import com.megna.backend.dtos.investor.InvestorStatusUpdateRequestDto;
import com.megna.backend.enums.InvestorStatus;
import com.megna.backend.services.InvestorService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping
@RequiredArgsConstructor
@PreAuthorize("hasRole('ADMIN')")
public class AdminInvestorApprovalController {

    private final InvestorService investorService;

    @GetMapping("/pending")
    public Page<InvestorResponseDto> getPending(
            @PageableDefault(size = 20, sort = "createdAt", direction = Sort.Direction.DESC) Pageable pageable
            ) {
        return investorService.search(InvestorStatus.PENDING, null, null, null, pageable);
    }

    @PatchMapping("/{id}/approve")
    public InvestorResponseDto approve(@PathVariable Long id) {
        return investorService.updateStatus(id, new InvestorStatusUpdateRequestDto(InvestorStatus.APPROVED));
    }

    @PatchMapping("/{id}/reject")
    public InvestorResponseDto reject(@PathVariable Long id) {
        return investorService.updateStatus(id, new InvestorStatusUpdateRequestDto(InvestorStatus.REJECTED));
    }

    @GetMapping("/{id}")
    public InvestorResponseDto getOne(@PathVariable Long id) {
        return investorService.getById(id);
    }
}

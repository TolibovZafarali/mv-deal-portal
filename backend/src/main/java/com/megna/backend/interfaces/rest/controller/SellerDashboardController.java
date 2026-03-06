package com.megna.backend.interfaces.rest.controller;

import com.megna.backend.application.service.SellerDashboardService;
import com.megna.backend.infrastructure.security.SecurityUtils;
import com.megna.backend.interfaces.rest.dto.seller.SellerDashboardSummaryDto;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/seller/dashboard")
@RequiredArgsConstructor
public class SellerDashboardController {

    private final SellerDashboardService sellerDashboardService;

    @GetMapping("/summary")
    public SellerDashboardSummaryDto getSummary() {
        long sellerId = SecurityUtils.requirePrincipal().userId();
        return sellerDashboardService.getMySummary(sellerId);
    }
}

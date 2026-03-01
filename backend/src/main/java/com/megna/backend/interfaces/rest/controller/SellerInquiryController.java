package com.megna.backend.interfaces.rest.controller;

import com.megna.backend.application.service.InquiryService;
import com.megna.backend.infrastructure.security.SecurityUtils;
import com.megna.backend.interfaces.rest.dto.inquiry.InquiryResponseDto;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/seller/inquiries")
@RequiredArgsConstructor
public class SellerInquiryController {

    private final InquiryService inquiryService;

    @GetMapping
    public Page<InquiryResponseDto> getMine(
            @PageableDefault(size = 20, sort = "createdAt", direction = Sort.Direction.DESC) Pageable pageable
    ) {
        long sellerId = SecurityUtils.requirePrincipal().userId();
        return inquiryService.getBySellerId(sellerId, pageable);
    }
}

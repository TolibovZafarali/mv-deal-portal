package com.megna.backend.interfaces.rest.controller;

import com.megna.backend.application.service.InquiryAdminReplyService;
import com.megna.backend.interfaces.rest.dto.inquiry.InquiryAdminReplyResponseDto;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/inquiry-replies")
@RequiredArgsConstructor
public class InquiryReplyController {

    private final InquiryAdminReplyService inquiryAdminReplyService;

    @GetMapping("/by-investor/{investorId}")
    public Page<InquiryAdminReplyResponseDto> getByInvestorId(
            @PathVariable Long investorId,
            @PageableDefault(size = 20, sort = "createdAt", direction = Sort.Direction.DESC) Pageable pageable
    ) {
        return inquiryAdminReplyService.getByInvestorId(investorId, pageable);
    }
}

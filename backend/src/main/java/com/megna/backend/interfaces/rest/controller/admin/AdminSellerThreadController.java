package com.megna.backend.interfaces.rest.controller.admin;

import com.megna.backend.application.service.SellerThreadService;
import com.megna.backend.interfaces.rest.dto.seller.SellerThreadCreateMessageRequestDto;
import com.megna.backend.interfaces.rest.dto.seller.SellerThreadDto;
import com.megna.backend.interfaces.rest.dto.seller.SellerThreadMessageDto;
import com.megna.backend.interfaces.rest.dto.seller.SellerThreadReadRequestDto;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/admin/seller-threads")
@RequiredArgsConstructor
@PreAuthorize("hasRole('ADMIN')")
public class AdminSellerThreadController {

    private final SellerThreadService sellerThreadService;

    @GetMapping
    public Page<SellerThreadDto> getThreads(
            @PageableDefault(size = 20, sort = "updatedAt", direction = Sort.Direction.DESC) Pageable pageable
    ) {
        return sellerThreadService.getAdminThreads(pageable);
    }

    @GetMapping("/{threadId}/messages")
    public Page<SellerThreadMessageDto> getMessages(
            @PathVariable Long threadId,
            @PageableDefault(size = 40, sort = "createdAt", direction = Sort.Direction.ASC) Pageable pageable
    ) {
        return sellerThreadService.getAdminThreadMessages(threadId, pageable);
    }

    @PostMapping("/{threadId}/messages")
    public ResponseEntity<SellerThreadMessageDto> createMessage(
            @PathVariable Long threadId,
            @Valid @RequestBody SellerThreadCreateMessageRequestDto dto
    ) {
        SellerThreadMessageDto created = sellerThreadService.createAdminMessage(threadId, dto);
        return ResponseEntity.status(HttpStatus.CREATED).body(created);
    }

    @PostMapping("/{threadId}/read")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void markRead(
            @PathVariable Long threadId,
            @RequestBody(required = false) SellerThreadReadRequestDto dto
    ) {
        sellerThreadService.markAdminThreadRead(threadId, dto);
    }
}

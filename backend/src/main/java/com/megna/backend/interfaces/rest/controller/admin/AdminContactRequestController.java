package com.megna.backend.interfaces.rest.controller.admin;

import com.megna.backend.application.service.ContactRequestService;
import com.megna.backend.domain.enums.ContactRequestCategory;
import com.megna.backend.domain.enums.ContactRequestStatus;
import com.megna.backend.interfaces.rest.dto.contact.ContactRequestResponseDto;
import com.megna.backend.interfaces.rest.dto.contact.ContactRequestStatusUpdateRequestDto;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/admin/contact-requests")
@RequiredArgsConstructor
@PreAuthorize("hasRole('ADMIN')")
public class AdminContactRequestController {

    private final ContactRequestService contactRequestService;

    @GetMapping
    public Page<ContactRequestResponseDto> search(
            @RequestParam(required = false) ContactRequestCategory category,
            @RequestParam(required = false) ContactRequestStatus status,
            @RequestParam(required = false) String q,
            @PageableDefault(size = 20, sort = "createdAt", direction = Sort.Direction.DESC) Pageable pageable
    ) {
        return contactRequestService.search(category, status, q, pageable);
    }

    @PatchMapping("/{id}/status")
    public ContactRequestResponseDto updateStatus(
            @PathVariable Long id,
            @Valid @RequestBody ContactRequestStatusUpdateRequestDto dto
    ) {
        return contactRequestService.updateStatus(id, dto);
    }
}

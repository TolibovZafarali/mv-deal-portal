package com.megna.backend.interfaces.rest.controller.admin;

import com.megna.backend.application.service.PropertyService;
import com.megna.backend.domain.enums.PropertyChangeRequestStatus;
import com.megna.backend.interfaces.rest.dto.property.AdminPropertyChangeRequestDecisionDto;
import com.megna.backend.interfaces.rest.dto.property.PropertyChangeRequestResponseDto;
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
@RequestMapping("/api/admin/property-change-requests")
@RequiredArgsConstructor
@PreAuthorize("hasRole('ADMIN')")
public class AdminPropertyChangeRequestController {

    private final PropertyService propertyService;

    @GetMapping
    public Page<PropertyChangeRequestResponseDto> getAll(
            @RequestParam(required = false) PropertyChangeRequestStatus status,
            @PageableDefault(size = 20, sort = "createdAt", direction = Sort.Direction.DESC) Pageable pageable
    ) {
        return propertyService.getAdminChangeRequests(status, pageable);
    }

    @PatchMapping("/{id}")
    public PropertyChangeRequestResponseDto moderate(
            @PathVariable Long id,
            @Valid @RequestBody AdminPropertyChangeRequestDecisionDto dto
    ) {
        return propertyService.moderateChangeRequest(id, dto.action(), dto.adminNote());
    }
}

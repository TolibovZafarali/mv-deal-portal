package com.megna.backend.interfaces.rest.controller.admin;

import com.megna.backend.application.service.PropertyService;
import com.megna.backend.interfaces.rest.dto.property.AdminPropertySellerAssignmentRequestDto;
import com.megna.backend.interfaces.rest.dto.property.PropertyResponseDto;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/admin/properties")
@RequiredArgsConstructor
@PreAuthorize("hasRole('ADMIN')")
public class AdminPropertyWorkflowController {

    private final PropertyService propertyService;

    @PatchMapping("/{id}/seller-assignment")
    public PropertyResponseDto assignSeller(
            @PathVariable Long id,
            @RequestBody AdminPropertySellerAssignmentRequestDto dto
    ) {
        Long sellerId = dto == null ? null : dto.sellerId();
        return propertyService.assignSeller(id, sellerId);
    }
}

package com.megna.backend.interfaces.rest.controller.admin;

import com.megna.backend.application.service.AdminQueueService;
import com.megna.backend.interfaces.rest.dto.admin.AdminQueueItemDto;
import com.megna.backend.interfaces.rest.dto.admin.AdminQueueItemType;
import com.megna.backend.interfaces.rest.dto.admin.AdminQueueSummaryDto;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.Collections;
import java.util.EnumSet;
import java.util.List;
import java.util.Set;

@RestController
@RequestMapping("/api/admin/queue")
@RequiredArgsConstructor
@PreAuthorize("hasRole('ADMIN')")
public class AdminQueueController {

    private final AdminQueueService adminQueueService;

    @GetMapping("/summary")
    public AdminQueueSummaryDto getSummary() {
        return adminQueueService.getSummary();
    }

    @GetMapping("/items")
    public Page<AdminQueueItemDto> getItems(
            @RequestParam(required = false) List<AdminQueueItemType> types,
            @PageableDefault(size = 20, sort = "createdAt", direction = Sort.Direction.ASC) Pageable pageable
    ) {
        Set<AdminQueueItemType> requestedTypes = (types == null || types.isEmpty())
                ? Collections.emptySet()
                : EnumSet.copyOf(types);
        return adminQueueService.getItems(requestedTypes, pageable);
    }
}

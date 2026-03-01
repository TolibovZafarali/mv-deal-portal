package com.megna.backend.interfaces.rest.dto.admin;

import java.time.LocalDateTime;

public record AdminQueueItemDto(
        String key,
        AdminQueueItemType type,
        Long entityId,
        String title,
        String subtitle,
        String details,
        LocalDateTime createdAt,
        int priority,
        String primaryAction
) {
}

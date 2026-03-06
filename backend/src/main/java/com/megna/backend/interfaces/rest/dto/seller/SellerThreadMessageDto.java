package com.megna.backend.interfaces.rest.dto.seller;

import com.megna.backend.domain.enums.SellerThreadMessageType;
import com.megna.backend.domain.enums.SellerThreadParticipantRole;

import java.time.LocalDateTime;

public record SellerThreadMessageDto(
        Long id,
        Long threadId,
        SellerThreadParticipantRole senderRole,
        Long senderId,
        SellerThreadMessageType messageType,
        String body,
        LocalDateTime createdAt
) {
}

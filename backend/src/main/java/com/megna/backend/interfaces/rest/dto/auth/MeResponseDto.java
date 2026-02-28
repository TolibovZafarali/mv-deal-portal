package com.megna.backend.interfaces.rest.dto.auth;

public record MeResponseDto(
        String email,
        long userId,
        Long investorId,
        Long sellerId,
        String role,
        String status
) {
}

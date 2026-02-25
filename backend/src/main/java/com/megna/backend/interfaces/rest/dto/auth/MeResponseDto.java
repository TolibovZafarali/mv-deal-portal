package com.megna.backend.interfaces.rest.dto.auth;

public record MeResponseDto(
        String email,
        long userId,
        Long investorId,
        String role,
        String status
) {
}

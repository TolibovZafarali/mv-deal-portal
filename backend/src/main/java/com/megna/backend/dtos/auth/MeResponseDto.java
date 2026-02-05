package com.megna.backend.dtos.auth;

public record MeResponseDto(
        String email,
        long userId,
        Long investorId,
        String role,
        String status
) {
}

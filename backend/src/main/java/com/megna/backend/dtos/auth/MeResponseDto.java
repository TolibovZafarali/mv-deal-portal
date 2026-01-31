package com.megna.backend.dtos.auth;

public record MeResponseDto(
        String email,
        long investorId,
        String role
) {
}

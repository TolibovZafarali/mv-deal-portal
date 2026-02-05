package com.megna.backend.dtos.auth;

public record RegisterResponseDto(
        long investorId,
        String email,
        String status
) {
}

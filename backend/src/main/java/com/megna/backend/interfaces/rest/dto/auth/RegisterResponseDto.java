package com.megna.backend.interfaces.rest.dto.auth;

public record RegisterResponseDto(
        long investorId,
        String email,
        String status
) {
}

package com.megna.backend.dtos.auth;

public record LoginResponseDto(
        String accessToken,
        String tokenType,
        long expiresInSeconds
) {
}

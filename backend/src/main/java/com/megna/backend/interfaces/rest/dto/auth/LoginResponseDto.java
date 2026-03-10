package com.megna.backend.interfaces.rest.dto.auth;

public record LoginResponseDto(
        String accessToken,
        String tokenType,
        long expiresInSeconds,
        MeResponseDto user
) {
    public LoginResponseDto(String accessToken, String tokenType, long expiresInSeconds) {
        this(accessToken, tokenType, expiresInSeconds, null);
    }
}

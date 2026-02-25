package com.megna.backend.infrastructure.security;

public record AuthPrincipal(
        String email,
        long userId,
        String role
) {
}

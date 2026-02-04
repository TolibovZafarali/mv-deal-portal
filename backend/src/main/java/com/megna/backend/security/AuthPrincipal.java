package com.megna.backend.security;

public record AuthPrincipal(
        String email,
        long userId,
        String role
) {
}

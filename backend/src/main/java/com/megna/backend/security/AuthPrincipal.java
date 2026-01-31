package com.megna.backend.security;

public record AuthPrincipal(
        String email,
        long investorId,
        String role
) {
}

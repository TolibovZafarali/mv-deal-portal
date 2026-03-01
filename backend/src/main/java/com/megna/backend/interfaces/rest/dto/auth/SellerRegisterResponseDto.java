package com.megna.backend.interfaces.rest.dto.auth;

public record SellerRegisterResponseDto(
        long sellerId,
        String email,
        String status
) {
}

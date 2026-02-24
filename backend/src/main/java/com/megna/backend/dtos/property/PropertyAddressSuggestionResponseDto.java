package com.megna.backend.dtos.property;

public record PropertyAddressSuggestionResponseDto(
        String display,
        String street1,
        String city,
        String state,
        String zip
) {
}

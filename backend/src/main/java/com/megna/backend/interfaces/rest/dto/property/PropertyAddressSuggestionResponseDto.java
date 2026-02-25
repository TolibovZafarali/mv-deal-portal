package com.megna.backend.interfaces.rest.dto.property;

public record PropertyAddressSuggestionResponseDto(
        String display,
        String street1,
        String city,
        String state,
        String zip
) {
}

package com.megna.backend.application.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.megna.backend.interfaces.rest.dto.property.PropertyAddressSuggestionResponseDto;
import org.junit.jupiter.api.Test;

import java.lang.reflect.Method;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;

class PropertyAddressAutocompleteServiceTest {

    @Test
    void parseSuggestionsFiltersOutStreetOnlyResults() throws Exception {
        PropertyAddressAutocompleteService service = newService();
        String json = """
                [
                  {
                    "display_name": "123 Main St, Springfield, Illinois 62704, United States",
                    "name": "123 Main St",
                    "address": {
                      "house_number": "123",
                      "road": "Main St",
                      "city": "Springfield",
                      "postcode": "62704",
                      "ISO3166-2-lvl4": "US-IL"
                    }
                  },
                  {
                    "display_name": "Main St, Springfield, Illinois 62704, United States",
                    "name": "Main St",
                    "address": {
                      "road": "Main St",
                      "city": "Springfield",
                      "postcode": "62704",
                      "ISO3166-2-lvl4": "US-IL"
                    }
                  },
                  {
                    "display_name": "55 Oak Ave, Springfield, Illinois 62704, United States",
                    "name": "Oak Ave",
                    "address": {
                      "road": "Oak Ave",
                      "city": "Springfield",
                      "postcode": "62704",
                      "ISO3166-2-lvl4": "US-IL"
                    }
                  }
                ]
                """;

        List<PropertyAddressSuggestionResponseDto> suggestions = parseSuggestions(service, json);

        assertEquals(2, suggestions.size());
        assertEquals("123 Main St", suggestions.get(0).street1());
        assertEquals("55 Oak Ave", suggestions.get(1).street1());
    }

    @Test
    void parseSuggestionsReturnsEmptyWhenProviderOnlyReturnsStreetNames() throws Exception {
        PropertyAddressAutocompleteService service = newService();
        String json = """
                [
                  {
                    "display_name": "Main St, Springfield, Illinois, United States",
                    "name": "Main St",
                    "address": {
                      "road": "Main St",
                      "city": "Springfield",
                      "ISO3166-2-lvl4": "US-IL"
                    }
                  },
                  {
                    "display_name": "Broadway, New York, New York, United States",
                    "name": "Broadway",
                    "address": {
                      "road": "Broadway",
                      "city": "New York",
                      "ISO3166-2-lvl4": "US-NY"
                    }
                  }
                ]
                """;

        List<PropertyAddressSuggestionResponseDto> suggestions = parseSuggestions(service, json);

        assertEquals(0, suggestions.size());
    }

    private static PropertyAddressAutocompleteService newService() {
        return new PropertyAddressAutocompleteService(
                new ObjectMapper(),
                "https://example.test/search",
                "test-agent",
                "us",
                6,
                10,
                2_500
        );
    }

    @SuppressWarnings("unchecked")
    private static List<PropertyAddressSuggestionResponseDto> parseSuggestions(
            PropertyAddressAutocompleteService service,
            String json
    ) throws Exception {
        Method method = PropertyAddressAutocompleteService.class
                .getDeclaredMethod("parseSuggestions", String.class);
        method.setAccessible(true);
        return (List<PropertyAddressSuggestionResponseDto>) method.invoke(service, json);
    }
}

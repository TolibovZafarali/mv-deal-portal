package com.megna.backend.services;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.megna.backend.dtos.property.PropertyAddressSuggestionResponseDto;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.net.URI;
import java.net.URLEncoder;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.math.BigDecimal;
import java.time.Duration;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;
import java.util.stream.Stream;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Service
@Slf4j
public class PropertyAddressAutocompleteService {

    private static final Pattern US_STATE_CODE_PATTERN = Pattern.compile("US-([A-Z]{2})");

    private final HttpClient httpClient;
    private final ObjectMapper objectMapper;
    private final String endpointUrl;
    private final String userAgent;
    private final String countryCodes;
    private final int defaultLimit;
    private final int maxLimit;
    private final Duration timeout;

    public record Coordinates(BigDecimal latitude, BigDecimal longitude) {}

    public PropertyAddressAutocompleteService(
            ObjectMapper objectMapper,
            @Value("${app.address-autocomplete.endpoint-url:https://nominatim.openstreetmap.org/search}") String endpointUrl,
            @Value("${app.address-autocomplete.user-agent:mv-deal-portal/1.0}") String userAgent,
            @Value("${app.address-autocomplete.country-codes:us}") String countryCodes,
            @Value("${app.address-autocomplete.default-limit:6}") int defaultLimit,
            @Value("${app.address-autocomplete.max-limit:10}") int maxLimit,
            @Value("${app.address-autocomplete.timeout-ms:2500}") long timeoutMs
    ) {
        this.httpClient = HttpClient.newBuilder().build();
        this.objectMapper = objectMapper;
        this.endpointUrl = endpointUrl;
        this.userAgent = userAgent;
        this.countryCodes = countryCodes;
        this.defaultLimit = defaultLimit;
        this.maxLimit = maxLimit;
        this.timeout = Duration.ofMillis(Math.max(timeoutMs, 500));
    }

    public List<PropertyAddressSuggestionResponseDto> search(String query, Integer requestedLimit) {
        String trimmedQuery = query == null ? "" : query.trim();
        if (trimmedQuery.length() < 3) return List.of();

        int effectiveLimit = resolveLimit(requestedLimit);
        String requestUrl = buildRequestUrl(trimmedQuery, effectiveLimit);

        HttpRequest request = HttpRequest.newBuilder(URI.create(requestUrl))
                .header("Accept", "application/json")
                .header("User-Agent", userAgent)
                .timeout(timeout)
                .GET()
                .build();

        try {
            HttpResponse<String> response = httpClient.send(
                    request,
                    HttpResponse.BodyHandlers.ofString(StandardCharsets.UTF_8)
            );

            if (response.statusCode() < 200 || response.statusCode() >= 300) {
                log.warn("Address autocomplete provider error. status={}", response.statusCode());
                return List.of();
            }

            return parseSuggestions(response.body());
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            log.warn("Address autocomplete request interrupted");
            return List.of();
        } catch (IOException | RuntimeException e) {
            log.warn("Address autocomplete request failed: {}", e.getMessage());
            return List.of();
        }
    }

    public Optional<Coordinates> geocode(String street1, String city, String state, String zip) {
        String query = buildGeocodeQuery(street1, city, state, zip);
        if (query.length() < 3) return Optional.empty();

        String requestUrl = buildRequestUrl(query, 1);

        HttpRequest request = HttpRequest.newBuilder(URI.create(requestUrl))
                .header("Accept", "application/json")
                .header("User-Agent", userAgent)
                .timeout(timeout)
                .GET()
                .build();

        try {
            HttpResponse<String> response = httpClient.send(
                    request,
                    HttpResponse.BodyHandlers.ofString(StandardCharsets.UTF_8)
            );

            if (response.statusCode() < 200 || response.statusCode() >= 300) {
                log.warn("Address geocoding provider error. status={}", response.statusCode());
                return Optional.empty();
            }

            return parseCoordinates(response.body());
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            log.warn("Address geocoding request interrupted");
            return Optional.empty();
        } catch (IOException | RuntimeException e) {
            log.warn("Address geocoding request failed: {}", e.getMessage());
            return Optional.empty();
        }
    }

    private String buildRequestUrl(String query, int limit) {
        String encodedQuery = URLEncoder.encode(query, StandardCharsets.UTF_8);
        String encodedCountryCodes = URLEncoder.encode(countryCodes, StandardCharsets.UTF_8);
        return endpointUrl
                + "?format=jsonv2&addressdetails=1"
                + "&limit=" + limit
                + "&countrycodes=" + encodedCountryCodes
                + "&q=" + encodedQuery;
    }

    private int resolveLimit(Integer requestedLimit) {
        int minLimit = 1;
        int safeDefault = Math.max(defaultLimit, minLimit);
        int safeMax = Math.max(maxLimit, safeDefault);

        if (requestedLimit == null) return Math.min(safeDefault, safeMax);
        if (requestedLimit < minLimit) return minLimit;
        return Math.min(requestedLimit, safeMax);
    }

    private List<PropertyAddressSuggestionResponseDto> parseSuggestions(String json) throws IOException {
        JsonNode root = objectMapper.readTree(json);
        if (!root.isArray()) return List.of();

        List<PropertyAddressSuggestionResponseDto> out = new ArrayList<>();
        for (JsonNode item : root) {
            JsonNode address = item.path("address");

            String display = asText(item, "display_name");
            String street1 = buildStreetLine1(item, address);
            String city = firstNonBlank(
                    asText(address, "city"),
                    asText(address, "town"),
                    asText(address, "village"),
                    asText(address, "hamlet"),
                    asText(address, "municipality"),
                    asText(address, "county")
            );
            String state = extractStateCode(address);
            String zip = asText(address, "postcode");

            if (street1.isBlank() && city.isBlank() && display.isBlank()) continue;

            out.add(new PropertyAddressSuggestionResponseDto(
                    display,
                    street1,
                    city,
                    state,
                    zip
            ));
        }

        return out;
    }

    private Optional<Coordinates> parseCoordinates(String json) throws IOException {
        JsonNode root = objectMapper.readTree(json);
        if (!root.isArray() || root.size() == 0) return Optional.empty();

        JsonNode first = root.get(0);
        BigDecimal latitude = parseDecimal(asText(first, "lat"));
        BigDecimal longitude = parseDecimal(asText(first, "lon"));

        if (latitude == null || longitude == null) {
            return Optional.empty();
        }

        return Optional.of(new Coordinates(latitude, longitude));
    }

    private static BigDecimal parseDecimal(String value) {
        if (value == null || value.isBlank()) return null;
        try {
            return new BigDecimal(value);
        } catch (NumberFormatException ignored) {
            return null;
        }
    }

    private static String buildGeocodeQuery(String street1, String city, String state, String zip) {
        return Stream.of(street1, city, state, zip)
                .map(value -> value == null ? "" : value.trim())
                .filter(value -> !value.isBlank())
                .collect(Collectors.joining(", "));
    }

    private static String buildStreetLine1(JsonNode item, JsonNode address) {
        String houseNumber = asText(address, "house_number");
        String road = firstNonBlank(
                asText(address, "road"),
                asText(address, "pedestrian"),
                asText(address, "residential"),
                asText(address, "footway")
        );

        String fromAddress = firstNonBlank(
                joinWithSpace(houseNumber, road),
                asText(address, "road"),
                asText(address, "neighbourhood")
        );

        if (!fromAddress.isBlank()) return fromAddress;

        String name = asText(item, "name");
        if (!name.isBlank()) return name;

        return "";
    }

    private static String extractStateCode(JsonNode address) {
        String isoLevel4 = asText(address, "ISO3166-2-lvl4");
        Matcher matcher = US_STATE_CODE_PATTERN.matcher(isoLevel4.toUpperCase());
        if (matcher.matches()) {
            return matcher.group(1);
        }
        return "";
    }

    private static String asText(JsonNode node, String fieldName) {
        if (node == null) return "";
        String value = node.path(fieldName).asText("");
        return value == null ? "" : value.trim();
    }

    private static String firstNonBlank(String... values) {
        for (String value : values) {
            if (value != null && !value.isBlank()) return value.trim();
        }
        return "";
    }

    private static String joinWithSpace(String left, String right) {
        String a = left == null ? "" : left.trim();
        String b = right == null ? "" : right.trim();
        if (a.isBlank()) return b;
        if (b.isBlank()) return a;
        return a + " " + b;
    }
}

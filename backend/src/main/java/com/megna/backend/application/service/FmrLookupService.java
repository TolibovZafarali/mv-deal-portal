package com.megna.backend.application.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Service;

import java.io.BufferedReader;
import java.io.IOException;
import java.io.InputStreamReader;
import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.util.Collections;
import java.util.HashMap;
import java.util.Map;

@Service
public class FmrLookupService {

    private final Map<String, FmrBands> byZip;

    public FmrLookupService(@Value("${app.fmr.csv-path:fmr/st_louis_metro_fy2026.csv}") String csvPath) {
        this.byZip = Collections.unmodifiableMap(loadFromCsv(csvPath));
    }

    public BigDecimal lookup(String zip, Integer beds) {
        String normalizedZip = normalizeZip(zip);
        if (normalizedZip == null || beds == null) {
            return null;
        }

        FmrBands bands = byZip.get(normalizedZip);
        if (bands == null) {
            return null;
        }

        if (beds <= 0) {
            return bands.efficiency();
        }
        if (beds == 1) {
            return bands.oneBedroom();
        }
        if (beds == 2) {
            return bands.twoBedroom();
        }
        if (beds == 3) {
            return bands.threeBedroom();
        }

        return bands.fourBedroom();
    }

    static String normalizeZip(String zip) {
        if (zip == null) return null;

        String trimmed = zip.trim();
        if (trimmed.isEmpty()) return null;

        String digitsOnly = trimmed.replaceAll("[^0-9]", "");
        if (digitsOnly.length() < 5) return null;

        return digitsOnly.substring(0, 5);
    }

    private static Map<String, FmrBands> loadFromCsv(String csvPath) {
        ClassPathResource resource = new ClassPathResource(csvPath);
        if (!resource.exists()) {
            throw new IllegalStateException("FMR CSV resource not found: " + csvPath);
        }

        Map<String, FmrBands> map = new HashMap<>();

        try (BufferedReader reader = new BufferedReader(
                new InputStreamReader(resource.getInputStream(), StandardCharsets.UTF_8))) {
            String line;
            boolean firstLine = true;

            while ((line = reader.readLine()) != null) {
                String trimmed = line.trim();
                if (trimmed.isEmpty()) continue;

                if (firstLine) {
                    firstLine = false;
                    if (trimmed.toLowerCase().startsWith("zip,")) {
                        continue;
                    }
                }

                String[] parts = trimmed.split(",", -1);
                if (parts.length != 6) {
                    throw new IllegalStateException("Invalid FMR row: " + line);
                }

                String zip = normalizeZip(parts[0]);
                if (zip == null) {
                    throw new IllegalStateException("Invalid ZIP in FMR row: " + line);
                }

                FmrBands bands = new FmrBands(
                        parseMoney(parts[1], line),
                        parseMoney(parts[2], line),
                        parseMoney(parts[3], line),
                        parseMoney(parts[4], line),
                        parseMoney(parts[5], line)
                );

                map.put(zip, bands);
            }
        } catch (IOException ex) {
            throw new IllegalStateException("Failed to read FMR CSV: " + csvPath, ex);
        }

        return map;
    }

    private static BigDecimal parseMoney(String value, String line) {
        String normalized = value == null ? "" : value.trim();
        if (normalized.isEmpty()) {
            throw new IllegalStateException("Missing FMR value in row: " + line);
        }

        try {
            return BigDecimal.valueOf(Long.parseLong(normalized));
        } catch (NumberFormatException ex) {
            throw new IllegalStateException("Invalid FMR value in row: " + line, ex);
        }
    }

    private record FmrBands(
            BigDecimal efficiency,
            BigDecimal oneBedroom,
            BigDecimal twoBedroom,
            BigDecimal threeBedroom,
            BigDecimal fourBedroom
    ) {}
}

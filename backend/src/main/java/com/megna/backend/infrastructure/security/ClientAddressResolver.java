package com.megna.backend.infrastructure.security;

import jakarta.servlet.http.HttpServletRequest;

public final class ClientAddressResolver {

    private static final String UNKNOWN = "unknown";

    private ClientAddressResolver() {
    }

    public static String resolve(HttpServletRequest request) {
        String forwardedFor = firstToken(request.getHeader("X-Forwarded-For"));
        if (!forwardedFor.isBlank()) {
            return normalize(forwardedFor);
        }

        String realIp = trim(request.getHeader("X-Real-IP"));
        if (!realIp.isBlank()) {
            return normalize(realIp);
        }

        String remoteAddr = trim(request.getRemoteAddr());
        if (!remoteAddr.isBlank()) {
            return normalize(remoteAddr);
        }

        return UNKNOWN;
    }

    private static String firstToken(String value) {
        String normalized = trim(value);
        if (normalized.isBlank()) {
            return "";
        }

        int commaIndex = normalized.indexOf(',');
        if (commaIndex < 0) {
            return normalized;
        }

        return trim(normalized.substring(0, commaIndex));
    }

    private static String normalize(String value) {
        if ("0:0:0:0:0:0:0:1".equals(value) || "::1".equals(value)) {
            return "127.0.0.1";
        }
        return value;
    }

    private static String trim(String value) {
        return value == null ? "" : value.trim();
    }
}

package com.megna.backend.infrastructure.security;

import com.megna.backend.infrastructure.config.AuthProperties;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseCookie;
import org.springframework.http.ResponseCookie.ResponseCookieBuilder;
import org.springframework.stereotype.Component;

import java.time.Duration;

@Component
@RequiredArgsConstructor
public class AuthRefreshCookieService {

    private final AuthProperties authProperties;

    public String readRefreshToken(HttpServletRequest request) {
        Cookie[] cookies = request.getCookies();
        if (cookies == null || cookies.length == 0) {
            return "";
        }

        String cookieName = authProperties.getRefreshCookieName();
        for (Cookie cookie : cookies) {
            if (cookie != null && cookieName.equals(cookie.getName())) {
                return cookie.getValue() == null ? "" : cookie.getValue().trim();
            }
        }

        return "";
    }

    public void writeRefreshToken(HttpServletResponse response, String rawToken) {
        ResponseCookie cookie = baseCookie(rawToken)
                .maxAge(Duration.ofDays(resolveRefreshTokenTtlDays()))
                .build();

        response.addHeader(HttpHeaders.SET_COOKIE, cookie.toString());
    }

    public void clearRefreshToken(HttpServletResponse response) {
        ResponseCookie cookie = baseCookie("")
                .maxAge(Duration.ZERO)
                .build();

        response.addHeader(HttpHeaders.SET_COOKIE, cookie.toString());
    }

    private ResponseCookieBuilder baseCookie(String value) {
        ResponseCookieBuilder builder = ResponseCookie.from(authProperties.getRefreshCookieName(), value)
                .httpOnly(true)
                .secure(authProperties.isRefreshCookieSecure())
                .sameSite(authProperties.getRefreshCookieSameSite())
                .path(authProperties.getRefreshCookiePath());

        String domain = resolveCookieDomain();
        if (!domain.isBlank()) {
            builder.domain(domain);
        }

        return builder;
    }

    private long resolveRefreshTokenTtlDays() {
        long ttlDays = authProperties.getRefreshTokenTtlDays();
        return ttlDays > 0 ? ttlDays : 30;
    }

    private String resolveCookieDomain() {
        String configuredDomain = authProperties.getRefreshCookieDomain();
        return configuredDomain == null ? "" : configuredDomain.trim();
    }
}

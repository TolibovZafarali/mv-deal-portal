package com.megna.backend.infrastructure.security;

import com.megna.backend.infrastructure.config.AuthProperties;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseCookie;
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
        ResponseCookie cookie = ResponseCookie.from(authProperties.getRefreshCookieName(), rawToken)
                .httpOnly(true)
                .secure(authProperties.isRefreshCookieSecure())
                .sameSite(authProperties.getRefreshCookieSameSite())
                .path(authProperties.getRefreshCookiePath())
                .maxAge(Duration.ofDays(resolveRefreshTokenTtlDays()))
                .build();

        response.addHeader(HttpHeaders.SET_COOKIE, cookie.toString());
    }

    public void clearRefreshToken(HttpServletResponse response) {
        ResponseCookie cookie = ResponseCookie.from(authProperties.getRefreshCookieName(), "")
                .httpOnly(true)
                .secure(authProperties.isRefreshCookieSecure())
                .sameSite(authProperties.getRefreshCookieSameSite())
                .path(authProperties.getRefreshCookiePath())
                .maxAge(Duration.ZERO)
                .build();

        response.addHeader(HttpHeaders.SET_COOKIE, cookie.toString());
    }

    private long resolveRefreshTokenTtlDays() {
        long ttlDays = authProperties.getRefreshTokenTtlDays();
        return ttlDays > 0 ? ttlDays : 30;
    }
}

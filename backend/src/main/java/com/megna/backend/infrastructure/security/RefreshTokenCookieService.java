package com.megna.backend.infrastructure.security;

import com.megna.backend.infrastructure.config.AuthProperties;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseCookie;
import org.springframework.stereotype.Component;
import org.springframework.web.util.WebUtils;

import java.time.Duration;

@Component
@RequiredArgsConstructor
public class RefreshTokenCookieService {

    private final AuthProperties authProperties;

    public void addRefreshCookie(HttpServletResponse response, String refreshToken) {
        if (refreshToken == null || refreshToken.isBlank()) {
            return;
        }

        long ttlMinutes = Math.max(authProperties.getRefreshTokenTtlMinutes(), 1L);
        ResponseCookie cookie = ResponseCookie.from(cookieName(), refreshToken)
                .httpOnly(true)
                .secure(authProperties.isRefreshCookieSecure())
                .sameSite(cookieSameSite())
                .path(cookiePath())
                .maxAge(Duration.ofMinutes(ttlMinutes))
                .build();

        response.addHeader(HttpHeaders.SET_COOKIE, cookie.toString());
    }

    public void clearRefreshCookie(HttpServletResponse response) {
        ResponseCookie cookie = ResponseCookie.from(cookieName(), "")
                .httpOnly(true)
                .secure(authProperties.isRefreshCookieSecure())
                .sameSite(cookieSameSite())
                .path(cookiePath())
                .maxAge(Duration.ZERO)
                .build();

        response.addHeader(HttpHeaders.SET_COOKIE, cookie.toString());
    }

    public String resolveRefreshToken(HttpServletRequest request) {
        Cookie cookie = WebUtils.getCookie(request, cookieName());
        if (cookie == null || cookie.getValue() == null) {
            return "";
        }
        return cookie.getValue().trim();
    }

    private String cookieName() {
        String name = authProperties.getRefreshCookieName();
        return (name == null || name.isBlank()) ? "mv_refresh_token" : name.trim();
    }

    private String cookiePath() {
        String path = authProperties.getRefreshCookiePath();
        if (path == null || path.isBlank()) {
            return "/api/auth";
        }
        String normalized = path.trim();
        return normalized.startsWith("/") ? normalized : "/" + normalized;
    }

    private String cookieSameSite() {
        String sameSite = authProperties.getRefreshCookieSameSite();
        if (sameSite == null || sameSite.isBlank()) {
            return "Lax";
        }
        return sameSite.trim();
    }
}

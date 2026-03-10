package com.megna.backend.infrastructure.security;

import com.megna.backend.infrastructure.config.AbuseProtectionProperties;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;
import org.springframework.web.servlet.HandlerInterceptor;

@Component
@RequiredArgsConstructor
public class PublicEndpointRateLimitInterceptor implements HandlerInterceptor {

    private final AbuseProtectionProperties abuseProtectionProperties;
    private final PublicEndpointRateLimiter publicEndpointRateLimiter;

    @Override
    public boolean preHandle(HttpServletRequest request, HttpServletResponse response, Object handler) {
        if (!abuseProtectionProperties.isEnabled() || !"POST".equalsIgnoreCase(request.getMethod())) {
            return true;
        }

        RateLimitRule rule = resolveRule(resolvePath(request));
        if (rule == null || !rule.limit().isEnabled()) {
            return true;
        }

        String clientAddress = ClientAddressResolver.resolve(request);
        publicEndpointRateLimiter.assertAllowed(
                rule.bucket(),
                clientAddress,
                rule.limit(),
                abuseProtectionProperties
        );
        return true;
    }

    private String resolvePath(HttpServletRequest request) {
        String requestUri = request.getRequestURI();
        if (requestUri == null || requestUri.isBlank()) {
            return request.getServletPath();
        }

        String contextPath = request.getContextPath();
        if (contextPath == null || contextPath.isBlank() || !requestUri.startsWith(contextPath)) {
            return requestUri;
        }

        String trimmed = requestUri.substring(contextPath.length());
        return trimmed.isBlank() ? "/" : trimmed;
    }

    private RateLimitRule resolveRule(String servletPath) {
        if (servletPath == null || servletPath.isBlank()) {
            return null;
        }

        return switch (servletPath) {
            case "/api/auth/login" ->
                    new RateLimitRule("auth.login", abuseProtectionProperties.getAuthLogin());
            case "/api/auth/register" ->
                    new RateLimitRule("auth.register", abuseProtectionProperties.getAuthRegister());
            case "/api/auth/register/seller" ->
                    new RateLimitRule("auth.register-seller", abuseProtectionProperties.getAuthRegisterSeller());
            case "/api/auth/password/forgot" ->
                    new RateLimitRule("auth.password-forgot", abuseProtectionProperties.getAuthPasswordForgot());
            case "/api/auth/password/reset" ->
                    new RateLimitRule("auth.password-reset", abuseProtectionProperties.getAuthPasswordReset());
            case "/api/auth/refresh" ->
                    new RateLimitRule("auth.refresh", abuseProtectionProperties.getAuthRefresh());
            case "/api/auth/logout" ->
                    new RateLimitRule("auth.logout", abuseProtectionProperties.getAuthLogout());
            case "/api/contact-requests" ->
                    new RateLimitRule("contact-requests", abuseProtectionProperties.getContactRequests());
            default -> null;
        };
    }

    private record RateLimitRule(String bucket, AbuseProtectionProperties.EndpointLimit limit) {
    }
}

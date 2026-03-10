package com.megna.backend.infrastructure.security;

import com.megna.backend.infrastructure.config.AbuseProtectionProperties;
import com.megna.backend.shared.error.RateLimitExceededException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.extern.slf4j.Slf4j;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.servlet.HandlerInterceptor;
import org.springframework.http.HttpHeaders;

@Component
@RequiredArgsConstructor
@Slf4j
public class PublicEndpointRateLimitInterceptor implements HandlerInterceptor {

    private static final String RATE_LIMIT_ERROR_CODE = "RATE_LIMIT_EXCEEDED";

    private final AbuseProtectionProperties abuseProtectionProperties;
    private final PublicEndpointRateLimiter publicEndpointRateLimiter;

    @Override
    public boolean preHandle(HttpServletRequest request, HttpServletResponse response, Object handler) {
        if (!abuseProtectionProperties.isEnabled()) {
            return true;
        }

        String endpoint = resolvePath(request);
        RateLimitRule rule = resolveRule(request.getMethod(), endpoint);
        if (rule == null || !rule.limit().isEnabled()) {
            return true;
        }

        String clientIp = ClientAddressResolver.resolve(request);
        AuthContext authContext = resolveAuthContext();
        String scopeKey = switch (rule.scope()) {
            case IP -> "ip:" + clientIp;
            case USER_OR_IP -> authContext.userId() > 0 ? "user:" + authContext.userId() : "ip:" + clientIp;
        };

        PublicEndpointRateLimiter.RateLimitDecision decision = publicEndpointRateLimiter.evaluate(
                rule.bucket(),
                scopeKey,
                rule.limit(),
                abuseProtectionProperties
        );
        response.setHeader("X-RateLimit-Limit", String.valueOf(decision.limit()));
        response.setHeader("X-RateLimit-Remaining", String.valueOf(decision.remaining()));

        if (!decision.allowed()) {
            response.setHeader(HttpHeaders.RETRY_AFTER, String.valueOf(decision.retryAfterSeconds()));
            log.warn(
                    "rate_limit_hit endpoint={} bucket={} method={} ip={} userId={} trafficType={} retryAfterSeconds={}",
                    endpoint,
                    rule.bucket(),
                    request.getMethod(),
                    clientIp,
                    authContext.userId() > 0 ? authContext.userId() : "anonymous",
                    authContext.userId() > 0 ? "authenticated" : "anonymous",
                    decision.retryAfterSeconds()
            );
            throw new RateLimitExceededException(decision.retryAfterSeconds(), RATE_LIMIT_ERROR_CODE);
        }

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

    private RateLimitRule resolveRule(String method, String servletPath) {
        if (servletPath == null || servletPath.isBlank()) {
            return null;
        }

        if (!"POST".equalsIgnoreCase(method)) {
            return null;
        }

        return switch (servletPath) {
            case "/api/auth/login" ->
                    new RateLimitRule("auth.login", abuseProtectionProperties.getAuthLogin(), Scope.IP);
            case "/api/auth/register" ->
                    new RateLimitRule("auth.register", abuseProtectionProperties.getAuthRegister(), Scope.IP);
            case "/api/auth/register/seller" ->
                    new RateLimitRule("auth.register-seller", abuseProtectionProperties.getAuthRegisterSeller(), Scope.IP);
            case "/api/auth/password/forgot" ->
                    new RateLimitRule("auth.password-forgot", abuseProtectionProperties.getAuthPasswordForgot(), Scope.IP);
            case "/api/auth/password/reset" ->
                    new RateLimitRule("auth.password-reset", abuseProtectionProperties.getAuthPasswordReset(), Scope.IP);
            case "/api/auth/password/change" ->
                    new RateLimitRule("auth.password-change", abuseProtectionProperties.getAuthPasswordChange(), Scope.USER_OR_IP);
            case "/api/auth/refresh" ->
                    new RateLimitRule("auth.refresh", abuseProtectionProperties.getAuthRefresh(), Scope.IP);
            case "/api/auth/logout" ->
                    new RateLimitRule("auth.logout", abuseProtectionProperties.getAuthLogout(), Scope.IP);
            case "/api/inquiries" ->
                    new RateLimitRule("inquiries.create", abuseProtectionProperties.getInquiries(), Scope.USER_OR_IP);
            case "/api/contact-requests" ->
                    new RateLimitRule("contact-requests", abuseProtectionProperties.getContactRequests(), Scope.IP);
            default -> null;
        };
    }

    private AuthContext resolveAuthContext() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || !(authentication.getPrincipal() instanceof AuthPrincipal principal)) {
            return AuthContext.anonymous();
        }
        return new AuthContext(principal.userId());
    }

    private enum Scope {
        IP,
        USER_OR_IP
    }

    private record AuthContext(long userId) {
        static AuthContext anonymous() {
            return new AuthContext(0L);
        }
    }

    private record RateLimitRule(String bucket, AbuseProtectionProperties.EndpointLimit limit, Scope scope) {
    }
}

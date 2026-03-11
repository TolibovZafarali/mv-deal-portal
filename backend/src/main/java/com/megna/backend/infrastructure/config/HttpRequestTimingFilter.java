package com.megna.backend.infrastructure.config;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;

@Component
@Order(Ordered.HIGHEST_PRECEDENCE + 20)
@Slf4j
public class HttpRequestTimingFilter extends OncePerRequestFilter {

    private final long slowThresholdMs;

    public HttpRequestTimingFilter(@Value("${app.http.slow-request-threshold-ms:1200}") long slowThresholdMs) {
        this.slowThresholdMs = Math.max(slowThresholdMs, 100L);
    }

    @Override
    protected void doFilterInternal(
            HttpServletRequest request,
            HttpServletResponse response,
            FilterChain filterChain
    ) throws ServletException, IOException {
        long startedAt = System.currentTimeMillis();
        try {
            filterChain.doFilter(request, response);
        } finally {
            long durationMs = System.currentTimeMillis() - startedAt;
            if (durationMs < slowThresholdMs) {
                return;
            }
            log.warn(
                    "slow_request method={} uri={} status={} durationMs={} remoteAddr={}",
                    request.getMethod(),
                    request.getRequestURI(),
                    response.getStatus(),
                    durationMs,
                    request.getRemoteAddr()
            );
        }
    }
}

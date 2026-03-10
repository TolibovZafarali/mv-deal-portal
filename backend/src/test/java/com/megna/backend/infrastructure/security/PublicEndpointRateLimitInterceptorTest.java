package com.megna.backend.infrastructure.security;

import com.megna.backend.infrastructure.config.AbuseProtectionProperties;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class PublicEndpointRateLimitInterceptorTest {

    private PublicEndpointRateLimitInterceptor interceptor;
    private AbuseProtectionProperties properties;

    @Mock
    private PublicEndpointRateLimiter limiter;

    @Mock
    private HttpServletRequest request;

    @Mock
    private HttpServletResponse response;

    @BeforeEach
    void setUp() {
        properties = new AbuseProtectionProperties();
        properties.setEnabled(true);
        interceptor = new PublicEndpointRateLimitInterceptor(properties, limiter);
        when(limiter.evaluate(any(), any(), any(), any()))
                .thenReturn(PublicEndpointRateLimiter.RateLimitDecision.allow(9, 10));
    }

    @AfterEach
    void tearDown() {
        SecurityContextHolder.clearContext();
    }

    @Test
    void usesUserScopeForAuthenticatedInquiryRequests() throws Exception {
        when(request.getMethod()).thenReturn("POST");
        when(request.getRequestURI()).thenReturn("/api/inquiries");
        when(request.getContextPath()).thenReturn("");
        when(request.getHeader("X-Forwarded-For")).thenReturn("198.51.100.50");

        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken(
                        new AuthPrincipal("investor@example.com", 42L, "INVESTOR"),
                        null
                )
        );

        interceptor.preHandle(request, response, new Object());

        ArgumentCaptor<String> keyCaptor = ArgumentCaptor.forClass(String.class);
        verify(limiter).evaluate(eq("inquiries.create"), keyCaptor.capture(), any(), eq(properties));
        assertEquals("user:42", keyCaptor.getValue());
    }

    @Test
    void fallsBackToIpScopeForAnonymousInquiryRequests() throws Exception {
        when(request.getMethod()).thenReturn("POST");
        when(request.getRequestURI()).thenReturn("/api/inquiries");
        when(request.getContextPath()).thenReturn("");
        when(request.getHeader("X-Forwarded-For")).thenReturn("198.51.100.51");

        interceptor.preHandle(request, response, new Object());

        ArgumentCaptor<String> keyCaptor = ArgumentCaptor.forClass(String.class);
        verify(limiter).evaluate(eq("inquiries.create"), keyCaptor.capture(), any(), eq(properties));
        assertEquals("ip:198.51.100.51", keyCaptor.getValue());
    }
}

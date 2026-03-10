package com.megna.backend.infrastructure.security;

import com.megna.backend.infrastructure.config.AbuseProtectionProperties;
import org.junit.jupiter.api.Test;

import java.util.concurrent.atomic.AtomicLong;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

class PublicEndpointRateLimiterTest {

    @Test
    void allowsNormalTrafficWithoutPrematureBlocking() {
        AtomicLong clock = new AtomicLong(0L);
        PublicEndpointRateLimiter limiter = new PublicEndpointRateLimiter(clock::get);
        AbuseProtectionProperties properties = defaults();
        AbuseProtectionProperties.EndpointLimit policy = limit(10, 10, 0, 3);

        for (int i = 0; i < 10; i++) {
            PublicEndpointRateLimiter.RateLimitDecision decision =
                    limiter.evaluate("contact", "ip:198.51.100.10", policy, properties);
            assertTrue(decision.allowed(), "request " + (i + 1) + " should be allowed");
            clock.addAndGet(1000L);
        }
    }

    @Test
    void blocksRapidBurstAndResetsAfterRefillWindow() {
        AtomicLong clock = new AtomicLong(0L);
        PublicEndpointRateLimiter limiter = new PublicEndpointRateLimiter(clock::get);
        AbuseProtectionProperties properties = defaults();
        AbuseProtectionProperties.EndpointLimit policy = limit(2, 60, 0, 3);

        assertTrue(limiter.evaluate("login", "ip:203.0.113.5", policy, properties).allowed());
        assertTrue(limiter.evaluate("login", "ip:203.0.113.5", policy, properties).allowed());
        PublicEndpointRateLimiter.RateLimitDecision denied =
                limiter.evaluate("login", "ip:203.0.113.5", policy, properties);
        assertFalse(denied.allowed());
        assertTrue(denied.retryAfterSeconds() >= 1);

        clock.addAndGet(30_000L);
        assertTrue(limiter.evaluate("login", "ip:203.0.113.5", policy, properties).allowed());
    }

    @Test
    void appliesCooldownOnlyAfterRepeatedDenials() {
        AtomicLong clock = new AtomicLong(0L);
        PublicEndpointRateLimiter limiter = new PublicEndpointRateLimiter(clock::get);
        AbuseProtectionProperties properties = defaults();
        AbuseProtectionProperties.EndpointLimit policy = limit(1, 300, 15, 2);

        assertTrue(limiter.evaluate("forgot", "ip:203.0.113.77", policy, properties).allowed());
        assertFalse(limiter.evaluate("forgot", "ip:203.0.113.77", policy, properties).allowed());
        PublicEndpointRateLimiter.RateLimitDecision cooldownDenied =
                limiter.evaluate("forgot", "ip:203.0.113.77", policy, properties);
        assertFalse(cooldownDenied.allowed());
        assertTrue(cooldownDenied.retryAfterSeconds() >= 15);

        clock.addAndGet(10_000L);
        assertFalse(limiter.evaluate("forgot", "ip:203.0.113.77", policy, properties).allowed());

        clock.addAndGet(6_000L);
        assertFalse(limiter.evaluate("forgot", "ip:203.0.113.77", policy, properties).allowed());
    }

    @Test
    void keepsDifferentEndpointPoliciesIndependent() {
        AtomicLong clock = new AtomicLong(0L);
        PublicEndpointRateLimiter limiter = new PublicEndpointRateLimiter(clock::get);
        AbuseProtectionProperties properties = defaults();
        AbuseProtectionProperties.EndpointLimit strictPolicy = limit(1, 600, 0, 3);
        AbuseProtectionProperties.EndpointLimit lightPolicy = limit(5, 60, 0, 3);

        assertTrue(limiter.evaluate("contact", "ip:198.51.100.1", strictPolicy, properties).allowed());
        assertFalse(limiter.evaluate("contact", "ip:198.51.100.1", strictPolicy, properties).allowed());

        for (int i = 0; i < 5; i++) {
            assertTrue(limiter.evaluate("auth.refresh", "ip:198.51.100.1", lightPolicy, properties).allowed());
        }
    }

    private AbuseProtectionProperties defaults() {
        AbuseProtectionProperties properties = new AbuseProtectionProperties();
        properties.setPruneIntervalSeconds(1);
        properties.setStaleEntryTtlSeconds(600);
        return properties;
    }

    private AbuseProtectionProperties.EndpointLimit limit(
            int maxRequests,
            long windowSeconds,
            int cooldownSeconds,
            int cooldownTriggerDenials
    ) {
        AbuseProtectionProperties.EndpointLimit policy = new AbuseProtectionProperties.EndpointLimit();
        policy.setEnabled(true);
        policy.setMaxRequests(maxRequests);
        policy.setWindowSeconds(windowSeconds);
        policy.setCooldownSeconds(cooldownSeconds);
        policy.setCooldownTriggerDenials(cooldownTriggerDenials);
        return policy;
    }
}

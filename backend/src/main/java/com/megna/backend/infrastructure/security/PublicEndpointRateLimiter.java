package com.megna.backend.infrastructure.security;

import com.megna.backend.infrastructure.config.AbuseProtectionProperties;
import org.springframework.stereotype.Component;

import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ConcurrentMap;
import java.util.concurrent.atomic.AtomicLong;
import java.util.function.LongSupplier;

@Component
public class PublicEndpointRateLimiter {

    private final ConcurrentMap<String, Counter> counters = new ConcurrentHashMap<>();
    private final AtomicLong lastPrunedAtMillis = new AtomicLong(0L);
    private final LongSupplier nowMillisSupplier;

    public PublicEndpointRateLimiter() {
        this(System::currentTimeMillis);
    }

    PublicEndpointRateLimiter(LongSupplier nowMillisSupplier) {
        this.nowMillisSupplier = nowMillisSupplier;
    }

    public RateLimitDecision evaluate(
            String bucket,
            String scopeKey,
            AbuseProtectionProperties.EndpointLimit limit,
            AbuseProtectionProperties properties
    ) {
        if (limit == null || limit.getMaxRequests() <= 0 || limit.getWindowSeconds() <= 0) {
            return RateLimitDecision.allowUnlimited();
        }

        long now = nowMillisSupplier.getAsLong();
        pruneIfNeeded(now, properties);

        String key = normalize(bucket) + "|" + normalize(scopeKey);
        Counter counter = counters.computeIfAbsent(key, ignored -> new Counter(now, limit.getMaxRequests()));
        return counter.tryConsume(now, limit);
    }

    public void clearAll() {
        counters.clear();
        lastPrunedAtMillis.set(0L);
    }

    private void pruneIfNeeded(long now, AbuseProtectionProperties properties) {
        long pruneIntervalMillis = Math.max(properties.getPruneIntervalSeconds(), 1L) * 1000L;
        long lastPrunedAt = lastPrunedAtMillis.get();
        if (now - lastPrunedAt < pruneIntervalMillis) {
            return;
        }
        if (!lastPrunedAtMillis.compareAndSet(lastPrunedAt, now)) {
            return;
        }

        long staleEntryTtlMillis = Math.max(properties.getStaleEntryTtlSeconds(), 1L) * 1000L;
        for (Map.Entry<String, Counter> entry : counters.entrySet()) {
            if (entry.getValue().isStale(now, staleEntryTtlMillis)) {
                counters.remove(entry.getKey(), entry.getValue());
            }
        }
    }

    private String normalize(String value) {
        if (value == null) {
            return "unknown";
        }

        String normalized = value.trim();
        return normalized.isBlank() ? "unknown" : normalized;
    }

    private static final class Counter {
        private double tokens;
        private long cooldownUntilMillis;
        private long lastSeenAtMillis;
        private long lastRefillAtMillis;
        private int consecutiveDeniedRequests;

        private Counter(long now, int initialCapacity) {
            this.tokens = Math.max(initialCapacity, 0);
            this.lastSeenAtMillis = now;
            this.lastRefillAtMillis = now;
        }

        /**
         * Token bucket keeps traffic smooth and fair: it allows short bursts (up to capacity),
         * then refills continuously over time. This avoids fixed-window boundary spikes.
         */
        private synchronized RateLimitDecision tryConsume(long now, AbuseProtectionProperties.EndpointLimit limit) {
            long cooldownMillis = Math.max(limit.getCooldownSeconds(), 0) * 1000L;
            if (cooldownUntilMillis > now) {
                int retryAfterSeconds = (int) Math.max(1L, (cooldownUntilMillis - now + 999L) / 1000L);
                lastSeenAtMillis = now;
                return RateLimitDecision.deny(retryAfterSeconds, 0, limit.getMaxRequests());
            }

            refill(now, limit);
            lastSeenAtMillis = now;
            if (tokens >= 1.0d) {
                tokens -= 1.0d;
                consecutiveDeniedRequests = 0;
                int remaining = (int) Math.floor(tokens);
                return RateLimitDecision.allow(remaining, limit.getMaxRequests());
            }

            consecutiveDeniedRequests++;
            long retryAfterMillis = millisToNextToken(limit);
            if (cooldownMillis > 0 && consecutiveDeniedRequests >= Math.max(limit.getCooldownTriggerDenials(), 1)) {
                cooldownUntilMillis = now + cooldownMillis;
                retryAfterMillis = Math.max(retryAfterMillis, cooldownMillis);
                consecutiveDeniedRequests = 0;
            }
            int retryAfterSeconds = (int) Math.max(1L, (retryAfterMillis + 999L) / 1000L);
            return RateLimitDecision.deny(retryAfterSeconds, 0, limit.getMaxRequests());
        }

        private void refill(long now, AbuseProtectionProperties.EndpointLimit limit) {
            if (now <= lastRefillAtMillis) {
                return;
            }

            double refillRatePerMillis =
                    ((double) Math.max(limit.getMaxRequests(), 1)) / (Math.max(limit.getWindowSeconds(), 1L) * 1000.0d);
            double elapsedMillis = now - lastRefillAtMillis;
            tokens = Math.min(limit.getMaxRequests(), tokens + (elapsedMillis * refillRatePerMillis));
            lastRefillAtMillis = now;
        }

        private long millisToNextToken(AbuseProtectionProperties.EndpointLimit limit) {
            double refillRatePerMillis =
                    ((double) Math.max(limit.getMaxRequests(), 1)) / (Math.max(limit.getWindowSeconds(), 1L) * 1000.0d);
            if (refillRatePerMillis <= 0) {
                return Math.max(limit.getWindowSeconds(), 1L) * 1000L;
            }
            double missingTokens = Math.max(0.0d, 1.0d - tokens);
            return (long) Math.ceil(missingTokens / refillRatePerMillis);
        }

        private synchronized boolean isStale(long now, long staleEntryTtlMillis) {
            return now - lastSeenAtMillis >= staleEntryTtlMillis;
        }
    }

    public record RateLimitDecision(boolean allowed, int retryAfterSeconds, int remaining, int limit) {
        static RateLimitDecision allowUnlimited() {
            return new RateLimitDecision(true, 0, Integer.MAX_VALUE, Integer.MAX_VALUE);
        }

        static RateLimitDecision allow(int remaining, int limit) {
            return new RateLimitDecision(true, 0, Math.max(remaining, 0), Math.max(limit, 0));
        }

        static RateLimitDecision deny(int retryAfterSeconds, int remaining, int limit) {
            return new RateLimitDecision(false, Math.max(retryAfterSeconds, 1), Math.max(remaining, 0), Math.max(limit, 0));
        }
    }
}

package com.megna.backend.infrastructure.security;

import com.megna.backend.infrastructure.config.AbuseProtectionProperties;
import com.megna.backend.shared.error.RateLimitExceededException;
import org.springframework.stereotype.Component;

import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ConcurrentMap;
import java.util.concurrent.atomic.AtomicLong;

@Component
public class PublicEndpointRateLimiter {

    private final ConcurrentMap<String, Counter> counters = new ConcurrentHashMap<>();
    private final AtomicLong lastPrunedAtMillis = new AtomicLong(0L);

    public void assertAllowed(
            String bucket,
            String clientAddress,
            AbuseProtectionProperties.EndpointLimit limit,
            AbuseProtectionProperties properties
    ) {
        if (limit == null || limit.getMaxRequests() <= 0 || limit.getWindowSeconds() <= 0) {
            return;
        }

        long now = System.currentTimeMillis();
        pruneIfNeeded(now, properties);

        String key = normalize(bucket) + "|" + normalize(clientAddress);
        Counter counter = counters.computeIfAbsent(key, ignored -> new Counter(now));
        RateLimitDecision decision = counter.tryConsume(now, limit);

        if (!decision.allowed()) {
            throw new RateLimitExceededException(decision.retryAfterSeconds());
        }
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
        private long windowStartedAtMillis;
        private long lastSeenAtMillis;
        private int requests;

        private Counter(long now) {
            this.windowStartedAtMillis = now;
            this.lastSeenAtMillis = now;
        }

        private synchronized RateLimitDecision tryConsume(long now, AbuseProtectionProperties.EndpointLimit limit) {
            long windowMillis = Math.max(limit.getWindowSeconds(), 1L) * 1000L;
            if (now - windowStartedAtMillis >= windowMillis) {
                windowStartedAtMillis = now;
                requests = 0;
            }

            lastSeenAtMillis = now;
            if (requests < limit.getMaxRequests()) {
                requests++;
                return new RateLimitDecision(true, 0);
            }

            long retryAfterMillis = Math.max(0L, (windowStartedAtMillis + windowMillis) - now);
            int retryAfterSeconds = (int) Math.max(1L, (retryAfterMillis + 999L) / 1000L);
            return new RateLimitDecision(false, retryAfterSeconds);
        }

        private synchronized boolean isStale(long now, long staleEntryTtlMillis) {
            return now - lastSeenAtMillis >= staleEntryTtlMillis;
        }
    }

    private record RateLimitDecision(boolean allowed, int retryAfterSeconds) {
    }
}

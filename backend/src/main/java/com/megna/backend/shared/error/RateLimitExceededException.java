package com.megna.backend.shared.error;

public class RateLimitExceededException extends RuntimeException {

    private static final String DEFAULT_MESSAGE = "Too many requests. Please try again later.";

    private final int retryAfterSeconds;

    public RateLimitExceededException(int retryAfterSeconds) {
        super(DEFAULT_MESSAGE);
        this.retryAfterSeconds = Math.max(retryAfterSeconds, 1);
    }

    public int getRetryAfterSeconds() {
        return retryAfterSeconds;
    }
}

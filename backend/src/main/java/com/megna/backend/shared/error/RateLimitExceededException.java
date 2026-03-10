package com.megna.backend.shared.error;

public class RateLimitExceededException extends RuntimeException {

    private static final String DEFAULT_MESSAGE = "Too many requests. Please try again later.";
    private static final String DEFAULT_ERROR_CODE = "RATE_LIMIT_EXCEEDED";

    private final int retryAfterSeconds;
    private final String errorCode;

    public RateLimitExceededException(int retryAfterSeconds) {
        this(retryAfterSeconds, DEFAULT_ERROR_CODE);
    }

    public RateLimitExceededException(int retryAfterSeconds, String errorCode) {
        super(DEFAULT_MESSAGE);
        this.retryAfterSeconds = Math.max(retryAfterSeconds, 1);
        this.errorCode = (errorCode == null || errorCode.isBlank()) ? DEFAULT_ERROR_CODE : errorCode;
    }

    public int getRetryAfterSeconds() {
        return retryAfterSeconds;
    }

    public String getErrorCode() {
        return errorCode;
    }
}

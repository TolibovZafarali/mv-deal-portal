package com.megna.backend.application.service.email;

public record TransactionalEmailDeliveryResult(
        TransactionalEmailDeliveryOutcome outcome,
        String detail,
        String providerMessageId
) {
    public TransactionalEmailDeliveryResult {
        outcome = outcome == null ? TransactionalEmailDeliveryOutcome.UNKNOWN : outcome;
        detail = detail == null ? "" : detail.trim();
        providerMessageId = providerMessageId == null ? "" : providerMessageId.trim();
    }

    public boolean isDelivered() {
        return outcome == TransactionalEmailDeliveryOutcome.DELIVERED;
    }

    public boolean shouldRetry() {
        return outcome == TransactionalEmailDeliveryOutcome.RETRYABLE_FAILURE;
    }

    public static TransactionalEmailDeliveryResult delivered(String detail, String providerMessageId) {
        return new TransactionalEmailDeliveryResult(
                TransactionalEmailDeliveryOutcome.DELIVERED,
                detail,
                providerMessageId
        );
    }

    public static TransactionalEmailDeliveryResult retryableFailure(String detail) {
        return new TransactionalEmailDeliveryResult(
                TransactionalEmailDeliveryOutcome.RETRYABLE_FAILURE,
                detail,
                ""
        );
    }

    public static TransactionalEmailDeliveryResult nonRetryableFailure(String detail) {
        return new TransactionalEmailDeliveryResult(
                TransactionalEmailDeliveryOutcome.NON_RETRYABLE_FAILURE,
                detail,
                ""
        );
    }

    public static TransactionalEmailDeliveryResult unknown(String detail) {
        return new TransactionalEmailDeliveryResult(
                TransactionalEmailDeliveryOutcome.UNKNOWN,
                detail,
                ""
        );
    }
}

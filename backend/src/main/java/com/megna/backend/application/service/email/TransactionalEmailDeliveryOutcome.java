package com.megna.backend.application.service.email;

public enum TransactionalEmailDeliveryOutcome {
    DELIVERED,
    RETRYABLE_FAILURE,
    NON_RETRYABLE_FAILURE,
    UNKNOWN
}

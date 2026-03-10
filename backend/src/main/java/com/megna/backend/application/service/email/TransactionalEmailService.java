package com.megna.backend.application.service.email;

public interface TransactionalEmailService {
    boolean sendTransactional(TransactionalEmailRequest request);

    default TransactionalEmailDeliveryResult sendTransactionalDetailed(TransactionalEmailRequest request) {
        boolean sent = sendTransactional(request);
        if (sent) {
            return TransactionalEmailDeliveryResult.delivered("legacy_boolean_success", "");
        }
        return TransactionalEmailDeliveryResult.retryableFailure("legacy_boolean_failure");
    }
}

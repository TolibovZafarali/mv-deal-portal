package com.megna.backend.application.service.email;

public interface TransactionalEmailService {
    boolean sendTransactional(TransactionalEmailRequest request);
}

package com.megna.backend.application.service.email;

public record TransactionalEmailRequest(
        String to,
        String subject,
        String textBody
) {
}

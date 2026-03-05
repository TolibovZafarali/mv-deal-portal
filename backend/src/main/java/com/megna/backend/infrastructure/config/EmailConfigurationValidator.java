package com.megna.backend.infrastructure.config;

import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class EmailConfigurationValidator {

    private final EmailProperties emailProperties;

    @PostConstruct
    void validateProductionEmailSettings() {
        if (!emailProperties.isProduction()) {
            return;
        }

        if (!emailProperties.isWebhooksEnabled()) {
            throw new IllegalStateException("app.email.webhooks-enabled must be true in production");
        }

        String webhookSecret = emailProperties.getWebhookSecret();
        if (isBlank(webhookSecret)) {
            throw new IllegalStateException("POSTMARK_WEBHOOK_SECRET must be configured in production");
        }

        if (!emailProperties.isEnabled()) {
            return;
        }

        if (isBlank(emailProperties.getFromAddress())) {
            throw new IllegalStateException("APP_EMAIL_FROM_ADDRESS must be configured when email is enabled in production");
        }

        if (isBlank(emailProperties.getReplyToAddress())) {
            throw new IllegalStateException("APP_EMAIL_REPLY_TO_ADDRESS must be configured when email is enabled in production");
        }

        if (isBlank(emailProperties.getPostmarkServerToken())) {
            throw new IllegalStateException("POSTMARK_SERVER_TOKEN must be configured when email is enabled in production");
        }

        if (isBlank(emailProperties.getPostmarkMessageStream())) {
            throw new IllegalStateException("POSTMARK_MESSAGE_STREAM must be configured when email is enabled in production");
        }
    }

    private static boolean isBlank(String value) {
        return value == null || value.trim().isBlank();
    }
}

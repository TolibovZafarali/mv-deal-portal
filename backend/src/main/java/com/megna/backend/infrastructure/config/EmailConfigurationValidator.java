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
        if (webhookSecret == null || webhookSecret.trim().isBlank()) {
            throw new IllegalStateException("POSTMARK_WEBHOOK_SECRET must be configured in production");
        }
    }
}

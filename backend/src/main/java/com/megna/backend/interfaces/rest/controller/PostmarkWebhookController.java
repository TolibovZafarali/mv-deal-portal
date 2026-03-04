package com.megna.backend.interfaces.rest.controller;

import com.megna.backend.application.service.email.PostmarkWebhookService;
import com.megna.backend.infrastructure.config.EmailProperties;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;

@RestController
@RequestMapping("/api/webhooks/postmark")
@RequiredArgsConstructor
public class PostmarkWebhookController {

    private static final String WEBHOOK_SECRET_HEADER = "X-Webhook-Secret";

    private final EmailProperties emailProperties;
    private final PostmarkWebhookService postmarkWebhookService;

    @PostMapping
    public ResponseEntity<Void> receive(@RequestBody(required = false) String rawPayload,
                                        HttpServletRequest request) {
        if (!emailProperties.isWebhooksEnabled()) {
            return ResponseEntity.accepted().build();
        }

        String expectedSecret = trim(emailProperties.getWebhookSecret());
        String providedSecret = trim(request.getHeader(WEBHOOK_SECRET_HEADER));
        if (!isSecretValid(expectedSecret, providedSecret)) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }

        if (rawPayload == null || rawPayload.isBlank()) {
            return ResponseEntity.badRequest().build();
        }

        boolean accepted = postmarkWebhookService.process(rawPayload);
        if (!accepted) {
            return ResponseEntity.badRequest().build();
        }

        return ResponseEntity.accepted().build();
    }

    private static boolean isSecretValid(String expectedSecret, String providedSecret) {
        if (expectedSecret == null || expectedSecret.isBlank()) {
            return false;
        }
        if (providedSecret == null || providedSecret.isBlank()) {
            return false;
        }

        return MessageDigest.isEqual(
                expectedSecret.getBytes(StandardCharsets.UTF_8),
                providedSecret.getBytes(StandardCharsets.UTF_8)
        );
    }

    private static String trim(String value) {
        if (value == null) {
            return null;
        }
        return value.trim();
    }
}

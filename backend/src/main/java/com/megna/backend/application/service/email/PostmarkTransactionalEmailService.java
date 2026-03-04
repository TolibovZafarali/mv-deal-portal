package com.megna.backend.application.service.email;

import com.megna.backend.infrastructure.config.EmailProperties;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.HashSet;
import java.util.Locale;
import java.util.Set;

@Service
@RequiredArgsConstructor
@Slf4j
public class PostmarkTransactionalEmailService implements TransactionalEmailService {

    private final EmailProperties emailProperties;
    private final PostmarkEmailClient postmarkEmailClient;
    private final EmailSuppressionService emailSuppressionService;

    @Override
    public boolean sendTransactional(TransactionalEmailRequest request) {
        if (request == null) return false;

        if (!emailProperties.isEnabled()) {
            return false;
        }

        if (isBlank(request.to()) || isBlank(request.subject()) || isBlank(request.textBody())) {
            return false;
        }

        if (isBlank(emailProperties.getFromAddress())
                || isBlank(emailProperties.getReplyToAddress())
                || isBlank(emailProperties.getPostmarkServerToken())
                || isBlank(emailProperties.getPostmarkMessageStream())) {
            log.warn("Email service is enabled but not fully configured");
            return false;
        }

        if (!emailProperties.isProduction() && !isAllowedInNonProduction(request.to())) {
            log.info("Suppressed transactional email in non-production for non-allowlisted recipient");
            return false;
        }

        if (emailProperties.isProduction() && emailSuppressionService.isSuppressed(request.to())) {
            log.info("Suppressed transactional email in production for suppressed recipient");
            return false;
        }

        return postmarkEmailClient.send(request);
    }

    private boolean isAllowedInNonProduction(String recipient) {
        String normalizedRecipient = normalizeEmail(recipient);
        Set<String> normalizedAllowlist = new HashSet<>();
        if (emailProperties.getNonProductionAllowlist() == null) {
            return false;
        }
        for (String email : emailProperties.getNonProductionAllowlist()) {
            String normalized = normalizeEmail(email);
            if (!normalized.isBlank()) {
                normalizedAllowlist.add(normalized);
            }
        }
        return normalizedAllowlist.contains(normalizedRecipient);
    }

    private static String normalizeEmail(String value) {
        return value == null ? "" : value.trim().toLowerCase(Locale.US);
    }

    private static boolean isBlank(String value) {
        return value == null || value.trim().isBlank();
    }
}

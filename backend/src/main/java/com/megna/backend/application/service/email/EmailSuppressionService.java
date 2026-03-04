package com.megna.backend.application.service.email;

import com.megna.backend.domain.entity.EmailSuppression;
import com.megna.backend.domain.repository.EmailSuppressionRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.Locale;

@Service
@RequiredArgsConstructor
public class EmailSuppressionService {

    private final EmailSuppressionRepository emailSuppressionRepository;

    public boolean isSuppressed(String email) {
        String normalized = normalizeEmail(email);
        if (normalized.isBlank()) {
            return false;
        }
        return emailSuppressionRepository.existsByEmail(normalized);
    }

    @Transactional
    public void suppress(String email,
                         String suppressionReason,
                         String sourceRecordType,
                         String messageId,
                         OffsetDateTime occurredAt) {
        String normalizedEmail = normalizeEmail(email);
        if (normalizedEmail.isBlank()) {
            return;
        }

        LocalDateTime suppressionTime = occurredAt == null
                ? LocalDateTime.now(ZoneOffset.UTC)
                : occurredAt.toLocalDateTime();

        EmailSuppression suppression = emailSuppressionRepository.findById(normalizedEmail)
                .orElseGet(EmailSuppression::new);

        if (suppression.getEmail() == null) {
            suppression.setEmail(normalizedEmail);
            suppression.setFirstSuppressedAt(suppressionTime);
        }

        suppression.setSuppressionReason(blankToUnknown(suppressionReason));
        suppression.setSourceRecordType(blankToUnknown(sourceRecordType));
        suppression.setLastPostmarkMessageId(blankToNull(messageId));
        suppression.setLastSuppressedAt(suppressionTime);

        emailSuppressionRepository.save(suppression);
    }

    private static String normalizeEmail(String value) {
        if (value == null) {
            return "";
        }
        return value.trim().toLowerCase(Locale.US);
    }

    private static String blankToUnknown(String value) {
        if (value == null || value.trim().isBlank()) {
            return "unknown";
        }
        return value.trim();
    }

    private static String blankToNull(String value) {
        if (value == null || value.trim().isBlank()) {
            return null;
        }
        return value.trim();
    }
}

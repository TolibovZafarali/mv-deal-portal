package com.megna.backend.application.service.email;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.megna.backend.domain.entity.EmailEvent;
import com.megna.backend.domain.repository.EmailEventRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.io.IOException;
import java.time.OffsetDateTime;
import java.time.format.DateTimeParseException;
import java.util.List;
import java.util.Locale;

@Service
@RequiredArgsConstructor
@Slf4j
public class PostmarkWebhookService {

    private static final int MAX_RAW_PAYLOAD_LENGTH = 16_384;

    private final ObjectMapper objectMapper;
    private final EmailEventRepository emailEventRepository;
    private final EmailSuppressionService emailSuppressionService;

    @Transactional
    public boolean process(String rawPayload) {
        JsonNode payload;
        try {
            payload = objectMapper.readTree(rawPayload);
        } catch (IOException ex) {
            return false;
        }

        String recordType = text(payload, "RecordType");
        if (recordType.isBlank()) {
            return false;
        }

        String canonicalRecordType = canonicalizeRecordType(recordType);
        String recipient = normalizeEmail(
                firstNonBlank(
                        text(payload, "Email"),
                        text(payload, "Recipient"),
                        text(payload, "RecipientEmail")
                )
        );
        String messageId = blankToNull(text(payload, "MessageID"));
        String messageStream = blankToNull(text(payload, "MessageStream"));
        OffsetDateTime occurredAt = extractOccurredAt(payload, canonicalRecordType);

        EmailEvent emailEvent = new EmailEvent();
        emailEvent.setRecordType(canonicalRecordType);
        emailEvent.setRecipientEmail(blankToNull(recipient));
        emailEvent.setPostmarkMessageId(messageId);
        emailEvent.setPostmarkMessageStream(messageStream);
        emailEvent.setOccurredAt(occurredAt == null ? null : occurredAt.toLocalDateTime());
        emailEvent.setRawPayload(safeRawPayload(rawPayload));
        emailEventRepository.save(emailEvent);

        if (shouldSuppress(payload, canonicalRecordType) && !recipient.isBlank()) {
            String reason = suppressionReason(payload, canonicalRecordType);
            emailSuppressionService.suppress(recipient, reason, canonicalRecordType, messageId, occurredAt);
        }

        log.info(
                "Processed Postmark webhook event type={} recipient={} messageId={}",
                canonicalRecordType,
                recipient.isBlank() ? "n/a" : recipient,
                messageId == null ? "n/a" : messageId
        );

        return true;
    }

    private static String canonicalizeRecordType(String recordType) {
        String normalized = recordType.trim().toLowerCase(Locale.US);
        if ("bounce".equals(normalized)) {
            return "Bounce";
        }
        if ("spamcomplaint".equals(normalized)) {
            return "SpamComplaint";
        }
        if ("delivery".equals(normalized)) {
            return "Delivery";
        }
        return recordType.trim();
    }

    private static boolean shouldSuppress(JsonNode payload, String recordType) {
        if ("SpamComplaint".equals(recordType)) {
            return true;
        }

        if (!"Bounce".equals(recordType)) {
            return false;
        }

        String bounceType = text(payload, "Type");
        if ("hardbounce".equalsIgnoreCase(bounceType)) {
            return true;
        }

        JsonNode inactive = payload.get("Inactive");
        if (inactive != null && inactive.isBoolean()) {
            return inactive.booleanValue();
        }

        return false;
    }

    private static String suppressionReason(JsonNode payload, String recordType) {
        if ("SpamComplaint".equals(recordType)) {
            return "spam_complaint";
        }

        String bounceType = text(payload, "Type");
        if (!bounceType.isBlank()) {
            return "bounce_" + bounceType.trim().toLowerCase(Locale.US);
        }

        return "bounce";
    }

    private static OffsetDateTime extractOccurredAt(JsonNode payload, String recordType) {
        List<String> candidates = switch (recordType) {
            case "Bounce" -> List.of("BouncedAt", "ReceivedAt", "DeliveredAt");
            case "SpamComplaint" -> List.of("ReceivedAt", "BouncedAt", "DeliveredAt");
            case "Delivery" -> List.of("DeliveredAt", "ReceivedAt", "BouncedAt");
            default -> List.of("ReceivedAt", "BouncedAt", "DeliveredAt");
        };

        for (String field : candidates) {
            String value = text(payload, field);
            if (value.isBlank()) {
                continue;
            }
            try {
                return OffsetDateTime.parse(value.trim());
            } catch (DateTimeParseException ignored) {
            }
        }
        return null;
    }

    private static String safeRawPayload(String rawPayload) {
        if (rawPayload == null) {
            return null;
        }
        if (rawPayload.length() <= MAX_RAW_PAYLOAD_LENGTH) {
            return rawPayload;
        }
        return rawPayload.substring(0, MAX_RAW_PAYLOAD_LENGTH);
    }

    private static String text(JsonNode payload, String fieldName) {
        if (payload == null || fieldName == null) {
            return "";
        }

        JsonNode value = payload.get(fieldName);
        if (value == null || value.isNull()) {
            return "";
        }
        if (value.isTextual()) {
            return value.textValue();
        }
        if (value.isNumber() || value.isBoolean()) {
            return value.asText();
        }
        return "";
    }

    private static String firstNonBlank(String... values) {
        if (values == null) {
            return "";
        }
        for (String value : values) {
            if (value != null && !value.trim().isBlank()) {
                return value.trim();
            }
        }
        return "";
    }

    private static String normalizeEmail(String value) {
        if (value == null) {
            return "";
        }
        return value.trim().toLowerCase(Locale.US);
    }

    private static String blankToNull(String value) {
        if (value == null || value.trim().isBlank()) {
            return null;
        }
        return value.trim();
    }
}

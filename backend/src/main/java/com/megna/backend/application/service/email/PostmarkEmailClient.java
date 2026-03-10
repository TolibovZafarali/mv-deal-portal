package com.megna.backend.application.service.email;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.megna.backend.infrastructure.config.EmailProperties;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.LinkedHashMap;
import java.util.Map;

@Component
@Slf4j
public class PostmarkEmailClient {

    private static final Duration REQUEST_TIMEOUT = Duration.ofSeconds(8);

    private final HttpClient httpClient;
    private final ObjectMapper objectMapper;
    private final EmailProperties emailProperties;

    @Autowired
    public PostmarkEmailClient(ObjectMapper objectMapper, EmailProperties emailProperties) {
        this(HttpClient.newBuilder().build(), objectMapper, emailProperties);
    }

    PostmarkEmailClient(HttpClient httpClient, ObjectMapper objectMapper, EmailProperties emailProperties) {
        this.httpClient = httpClient;
        this.objectMapper = objectMapper;
        this.emailProperties = emailProperties;
    }

    public boolean send(TransactionalEmailRequest request) {
        return sendDetailed(request).isDelivered();
    }

    public TransactionalEmailDeliveryResult sendDetailed(TransactionalEmailRequest request) {
        try {
            String endpoint = resolveEndpoint(request);
            String payload = objectMapper.writeValueAsString(buildPayload(request));

            HttpRequest httpRequest = HttpRequest.newBuilder(URI.create(endpoint))
                    .header("Accept", "application/json")
                    .header("Content-Type", "application/json")
                    .header("X-Postmark-Server-Token", emailProperties.getPostmarkServerToken())
                    .timeout(REQUEST_TIMEOUT)
                    .POST(HttpRequest.BodyPublishers.ofString(payload, StandardCharsets.UTF_8))
                    .build();

            HttpResponse<String> response = httpClient.send(
                    httpRequest,
                    HttpResponse.BodyHandlers.ofString(StandardCharsets.UTF_8)
            );
            int status = response.statusCode();
            if (status >= 200 && status < 300) {
                String messageId = readBodyField(response.body(), "MessageID");
                return TransactionalEmailDeliveryResult.delivered("postmark_2xx", messageId);
            }
            String detail = nonSuccessDetail(status, response.body());
            log.warn("Postmark API returned non-success status: {}", status);
            if (isRetryableStatus(status)) {
                return TransactionalEmailDeliveryResult.retryableFailure(detail);
            }
            return TransactionalEmailDeliveryResult.nonRetryableFailure(detail);
        } catch (JsonProcessingException e) {
            log.warn("Failed to serialize Postmark email request");
            return TransactionalEmailDeliveryResult.nonRetryableFailure("serialize_failed");
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            log.warn("Postmark API call interrupted");
            return TransactionalEmailDeliveryResult.unknown("interrupted");
        } catch (IOException | RuntimeException e) {
            log.warn("Postmark API call failed: {}", e.getClass().getSimpleName());
            return TransactionalEmailDeliveryResult.unknown("transport_" + e.getClass().getSimpleName());
        }
    }

    private Map<String, Object> buildPayload(TransactionalEmailRequest request) {
        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("From", emailProperties.getFromAddress());
        payload.put("To", request.to());
        payload.put("ReplyTo", emailProperties.getReplyToAddress());
        if (request.isTemplate()) {
            payload.put("TemplateAlias", request.templateAlias());
            payload.put("TemplateModel", request.templateModel());
        } else {
            payload.put("Subject", request.subject());
            payload.put("TextBody", request.textBody());
        }
        payload.put("MessageStream", emailProperties.getPostmarkMessageStream());
        return payload;
    }

    private String resolveEndpoint(TransactionalEmailRequest request) {
        String baseUrl = emailProperties.getPostmarkApiBaseUrl() == null
                ? ""
                : emailProperties.getPostmarkApiBaseUrl().trim();
        String endpointPath = request != null && request.isTemplate() ? "email/withTemplate" : "email";
        if (baseUrl.endsWith("/")) {
            return baseUrl + endpointPath;
        }
        return baseUrl + "/" + endpointPath;
    }

    private static boolean isRetryableStatus(int status) {
        return status == 408 || status == 429 || status >= 500;
    }

    private String nonSuccessDetail(int status, String body) {
        String message = normalizeForError(readBodyField(body, "Message"));
        String errorCode = normalizeForError(readBodyField(body, "ErrorCode"));
        String messageId = normalizeForError(readBodyField(body, "MessageID"));

        StringBuilder detail = new StringBuilder("postmark_status_").append(status);
        if (!errorCode.isBlank()) {
            detail.append("_code_").append(errorCode);
        }
        if (!messageId.isBlank()) {
            detail.append("_msg_").append(messageId);
        }
        if (!message.isBlank()) {
            detail.append(": ").append(message);
        }
        return trimToLength(detail.toString(), 500);
    }

    private String readBodyField(String body, String fieldName) {
        if (body == null || body.isBlank() || fieldName == null || fieldName.isBlank()) {
            return "";
        }
        try {
            JsonNode node = objectMapper.readTree(body).get(fieldName);
            if (node == null || node.isNull()) {
                return "";
            }
            if (node.isTextual() || node.isNumber() || node.isBoolean()) {
                return node.asText();
            }
            return "";
        } catch (IOException ignored) {
            return "";
        }
    }

    private static String normalizeForError(String value) {
        if (value == null) return "";
        return value.trim().replaceAll("\\s+", " ");
    }

    private static String trimToLength(String value, int maxLength) {
        if (value == null) return "";
        if (value.length() <= maxLength) {
            return value;
        }
        return value.substring(0, maxLength);
    }
}

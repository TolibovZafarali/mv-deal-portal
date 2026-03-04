package com.megna.backend.application.service.email;

import com.fasterxml.jackson.core.JsonProcessingException;
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
        try {
            String endpoint = resolveEndpoint();
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
                return true;
            }
            log.warn("Postmark API returned non-success status: {}", status);
            return false;
        } catch (JsonProcessingException e) {
            log.warn("Failed to serialize Postmark email request");
            return false;
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            log.warn("Postmark API call interrupted");
            return false;
        } catch (IOException | RuntimeException e) {
            log.warn("Postmark API call failed: {}", e.getClass().getSimpleName());
            return false;
        }
    }

    private Map<String, Object> buildPayload(TransactionalEmailRequest request) {
        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("From", emailProperties.getFromAddress());
        payload.put("To", request.to());
        payload.put("ReplyTo", emailProperties.getReplyToAddress());
        payload.put("Subject", request.subject());
        payload.put("TextBody", request.textBody());
        payload.put("MessageStream", emailProperties.getPostmarkMessageStream());
        return payload;
    }

    private String resolveEndpoint() {
        String baseUrl = emailProperties.getPostmarkApiBaseUrl() == null
                ? ""
                : emailProperties.getPostmarkApiBaseUrl().trim();
        if (baseUrl.endsWith("/")) {
            return baseUrl + "email";
        }
        return baseUrl + "/email";
    }
}

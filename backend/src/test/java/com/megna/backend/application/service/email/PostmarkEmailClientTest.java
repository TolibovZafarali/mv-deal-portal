package com.megna.backend.application.service.email;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.megna.backend.infrastructure.config.EmailProperties;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.io.IOException;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class PostmarkEmailClientTest {

    @Mock
    private HttpClient httpClient;

    @Mock
    private ObjectMapper objectMapper;

    @Mock
    private EmailProperties emailProperties;

    @Test
    void sendBuildsExpectedRequestAndReturnsTrueOn2xx() throws Exception {
        PostmarkEmailClient client = new PostmarkEmailClient(httpClient, objectMapper, emailProperties);

        when(emailProperties.getPostmarkApiBaseUrl()).thenReturn("https://api.postmarkapp.com");
        when(emailProperties.getPostmarkServerToken()).thenReturn("test-token");
        when(emailProperties.getFromAddress()).thenReturn("no-reply@megna-realestate.com");
        when(emailProperties.getReplyToAddress()).thenReturn("contact@megna-realestate.com");
        when(emailProperties.getPostmarkMessageStream()).thenReturn("outbound-stream");
        when(objectMapper.writeValueAsString(any())).thenReturn("{\"ok\":true}");

        HttpResponse<String> response = mock(HttpResponse.class);
        when(response.statusCode()).thenReturn(200);
        when(httpClient.send(any(HttpRequest.class), any(HttpResponse.BodyHandler.class))).thenReturn(response);

        boolean sent = client.send(new TransactionalEmailRequest(
                "buyer@example.com",
                "Subject line",
                "Email body"
        ));

        assertTrue(sent);

        ArgumentCaptor<HttpRequest> requestCaptor = ArgumentCaptor.forClass(HttpRequest.class);
        verify(httpClient).send(requestCaptor.capture(), any(HttpResponse.BodyHandler.class));
        HttpRequest request = requestCaptor.getValue();
        assertEquals("https://api.postmarkapp.com/email", request.uri().toString());
        assertEquals("application/json", request.headers().firstValue("Accept").orElse(""));
        assertEquals("application/json", request.headers().firstValue("Content-Type").orElse(""));
        assertEquals("test-token", request.headers().firstValue("X-Postmark-Server-Token").orElse(""));

        ArgumentCaptor<Object> payloadCaptor = ArgumentCaptor.forClass(Object.class);
        verify(objectMapper).writeValueAsString(payloadCaptor.capture());
        Map<?, ?> payload = (Map<?, ?>) payloadCaptor.getValue();
        assertEquals("no-reply@megna-realestate.com", payload.get("From"));
        assertEquals("buyer@example.com", payload.get("To"));
        assertEquals("contact@megna-realestate.com", payload.get("ReplyTo"));
        assertEquals("Subject line", payload.get("Subject"));
        assertEquals("Email body", payload.get("TextBody"));
        assertEquals("outbound-stream", payload.get("MessageStream"));
    }

    @Test
    void sendReturnsFalseOnNon2xxStatus() throws Exception {
        PostmarkEmailClient client = new PostmarkEmailClient(httpClient, objectMapper, emailProperties);

        when(emailProperties.getPostmarkApiBaseUrl()).thenReturn("https://api.postmarkapp.com/");
        when(emailProperties.getPostmarkServerToken()).thenReturn("test-token");
        when(emailProperties.getFromAddress()).thenReturn("no-reply@megna-realestate.com");
        when(emailProperties.getReplyToAddress()).thenReturn("contact@megna-realestate.com");
        when(emailProperties.getPostmarkMessageStream()).thenReturn("outbound-stream");
        when(objectMapper.writeValueAsString(any())).thenReturn("{\"ok\":true}");

        HttpResponse<String> response = mock(HttpResponse.class);
        when(response.statusCode()).thenReturn(422);
        when(httpClient.send(any(HttpRequest.class), any(HttpResponse.BodyHandler.class))).thenReturn(response);

        boolean sent = client.send(new TransactionalEmailRequest(
                "buyer@example.com",
                "Subject line",
                "Email body"
        ));

        assertFalse(sent);
    }

    @Test
    void sendReturnsFalseOnIOException() throws Exception {
        PostmarkEmailClient client = new PostmarkEmailClient(httpClient, objectMapper, emailProperties);

        when(emailProperties.getPostmarkApiBaseUrl()).thenReturn("https://api.postmarkapp.com");
        when(emailProperties.getPostmarkServerToken()).thenReturn("test-token");
        when(emailProperties.getFromAddress()).thenReturn("no-reply@megna-realestate.com");
        when(emailProperties.getReplyToAddress()).thenReturn("contact@megna-realestate.com");
        when(emailProperties.getPostmarkMessageStream()).thenReturn("outbound-stream");
        when(objectMapper.writeValueAsString(any())).thenReturn("{\"ok\":true}");
        when(httpClient.send(any(HttpRequest.class), any(HttpResponse.BodyHandler.class)))
                .thenThrow(new IOException("network error"));

        boolean sent = client.send(new TransactionalEmailRequest(
                "buyer@example.com",
                "Subject line",
                "Email body"
        ));

        assertFalse(sent);
    }
}

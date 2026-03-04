package com.megna.backend;

import com.megna.backend.domain.entity.EmailEvent;
import com.megna.backend.domain.entity.EmailSuppression;
import com.megna.backend.domain.repository.EmailEventRepository;
import com.megna.backend.domain.repository.EmailSuppressionRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.context.WebApplicationContext;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest(
        webEnvironment = SpringBootTest.WebEnvironment.MOCK,
        properties = {
                "app.email.webhooks-enabled=true",
                "app.email.webhook-secret=test-webhook-secret",
                "app.email.production=false"
        }
)
class PostmarkWebhookControllerIntegrationTest {

    @Autowired
    private WebApplicationContext webApplicationContext;

    @Autowired
    private EmailEventRepository emailEventRepository;

    @Autowired
    private EmailSuppressionRepository emailSuppressionRepository;

    private MockMvc mockMvc;

    @BeforeEach
    void setUp() {
        mockMvc = MockMvcBuilders.webAppContextSetup(webApplicationContext).build();
        emailEventRepository.deleteAll();
        emailSuppressionRepository.deleteAll();
    }

    @Test
    void webhookMissingSecretHeaderReturnsUnauthorized() throws Exception {
        mockMvc.perform(post("/api/webhooks/postmark")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"RecordType\":\"Bounce\"}"))
                .andExpect(status().isUnauthorized());

        assertEquals(0, emailEventRepository.count());
    }

    @Test
    void webhookIncorrectSecretHeaderReturnsUnauthorized() throws Exception {
        mockMvc.perform(post("/api/webhooks/postmark")
                        .header("X-Webhook-Secret", "wrong-secret")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"RecordType\":\"Bounce\"}"))
                .andExpect(status().isUnauthorized());

        assertEquals(0, emailEventRepository.count());
    }

    @Test
    void hardBounceWebhookWithCorrectSecretPersistsEventAndSuppression() throws Exception {
        String payload = """
                {
                  "RecordType": "Bounce",
                  "MessageID": "msg-bounce-1",
                  "MessageStream": "outbound",
                  "Email": "hardbounce@example.com",
                  "Type": "HardBounce",
                  "BouncedAt": "2026-03-03T08:10:30-06:00",
                  "Inactive": true
                }
                """;

        mockMvc.perform(post("/api/webhooks/postmark")
                        .header("X-Webhook-Secret", "test-webhook-secret")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(payload))
                .andExpect(status().is2xxSuccessful());

        List<EmailEvent> events = emailEventRepository.findAll();
        assertEquals(1, events.size());

        EmailEvent event = events.getFirst();
        assertEquals("Bounce", event.getRecordType());
        assertEquals("hardbounce@example.com", event.getRecipientEmail());
        assertEquals("msg-bounce-1", event.getPostmarkMessageId());
        assertNotNull(event.getOccurredAt());

        EmailSuppression suppression = emailSuppressionRepository.findById("hardbounce@example.com").orElse(null);
        assertNotNull(suppression);
        assertEquals("bounce_hardbounce", suppression.getSuppressionReason());
    }

    @Test
    void spamComplaintWebhookWithCorrectSecretPersistsEventAndSuppression() throws Exception {
        String payload = """
                {
                  "RecordType": "SpamComplaint",
                  "MessageID": "msg-complaint-1",
                  "MessageStream": "outbound",
                  "Email": "complaint@example.com",
                  "ReceivedAt": "2026-03-03T09:22:11-06:00"
                }
                """;

        mockMvc.perform(post("/api/webhooks/postmark")
                        .header("X-Webhook-Secret", "test-webhook-secret")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(payload))
                .andExpect(status().is2xxSuccessful());

        assertEquals(1, emailEventRepository.count());
        assertTrue(emailSuppressionRepository.existsById("complaint@example.com"));

        EmailSuppression suppression = emailSuppressionRepository.findById("complaint@example.com").orElseThrow();
        assertEquals("spam_complaint", suppression.getSuppressionReason());
    }

    @Test
    void deliveryWebhookWithCorrectSecretPersistsEventWithoutSuppression() throws Exception {
        String payload = """
                {
                  "RecordType": "Delivery",
                  "MessageID": "msg-delivery-1",
                  "MessageStream": "outbound",
                  "Recipient": "delivered@example.com",
                  "DeliveredAt": "2026-03-03T10:45:00-06:00"
                }
                """;

        mockMvc.perform(post("/api/webhooks/postmark")
                        .header("X-Webhook-Secret", "test-webhook-secret")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(payload))
                .andExpect(status().is2xxSuccessful());

        assertEquals(1, emailEventRepository.count());
        assertFalse(emailSuppressionRepository.existsById("delivered@example.com"));

        EmailEvent event = emailEventRepository.findAll().getFirst();
        assertEquals("Delivery", event.getRecordType());
        assertEquals("delivered@example.com", event.getRecipientEmail());
    }
}

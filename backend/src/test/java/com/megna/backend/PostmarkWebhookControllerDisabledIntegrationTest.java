package com.megna.backend;

import com.megna.backend.domain.repository.EmailEventRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.context.WebApplicationContext;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest(
        webEnvironment = SpringBootTest.WebEnvironment.MOCK,
        properties = {
                "app.email.webhooks-enabled=false",
                "app.email.webhook-secret=",
                "app.email.production=false"
        }
)
class PostmarkWebhookControllerDisabledIntegrationTest {

    @Autowired
    private WebApplicationContext webApplicationContext;

    @Autowired
    private EmailEventRepository emailEventRepository;

    private MockMvc mockMvc;

    @BeforeEach
    void setUp() {
        mockMvc = MockMvcBuilders.webAppContextSetup(webApplicationContext).build();
        emailEventRepository.deleteAll();
    }

    @Test
    void webhookDisabledAcceptsWithoutSecretAndSkipsProcessing() throws Exception {
        mockMvc.perform(post("/api/webhooks/postmark")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"RecordType\":\"Bounce\",\"Email\":\"ignored@example.com\"}"))
                .andExpect(status().isAccepted());

        assertEquals(0, emailEventRepository.count());
    }
}

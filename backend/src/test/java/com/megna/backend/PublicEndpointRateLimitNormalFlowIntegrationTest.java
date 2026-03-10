package com.megna.backend;

import com.megna.backend.infrastructure.security.PublicEndpointRateLimiter;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.web.servlet.MockMvc;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest(
        webEnvironment = SpringBootTest.WebEnvironment.MOCK,
        properties = {
                "app.abuse-protection.enabled=true",
                "app.abuse-protection.contact-requests.max-requests=6",
                "app.abuse-protection.contact-requests.window-seconds=60",
                "app.abuse-protection.contact-requests.cooldown-seconds=0"
        }
)
@AutoConfigureMockMvc
class PublicEndpointRateLimitNormalFlowIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private JdbcTemplate jdbcTemplate;

    @Autowired
    private PublicEndpointRateLimiter publicEndpointRateLimiter;

    @BeforeEach
    void setUp() {
        publicEndpointRateLimiter.clearAll();
        jdbcTemplate.update("DELETE FROM contact_requests");
    }

    @Test
    void normalContactRequestFlowShouldNotTrigger429TooEarly() throws Exception {
        String body = """
                {
                  "category":"GENERAL_SUPPORT",
                  "name":"Jamie Carter",
                  "email":"jamie@example.com",
                  "message":"Need details about investment process."
                }
                """;

        for (int i = 0; i < 3; i++) {
            mockMvc.perform(post("/api/contact-requests")
                            .header("X-Forwarded-For", "198.51.100.15")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(body))
                    .andExpect(status().isCreated());
        }

        Integer savedCount = jdbcTemplate.queryForObject("SELECT COUNT(*) FROM contact_requests", Integer.class);
        assertEquals(3, savedCount == null ? 0 : savedCount);
    }
}

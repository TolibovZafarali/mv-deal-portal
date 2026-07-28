package com.megna.backend;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.megna.backend.infrastructure.security.PublicEndpointRateLimiter;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import java.sql.Timestamp;
import java.time.LocalDateTime;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest(
        webEnvironment = SpringBootTest.WebEnvironment.MOCK,
        properties = {
                "app.abuse-protection.enabled=true",
                "app.abuse-protection.auth-login.max-requests=3",
                "app.abuse-protection.auth-login.window-seconds=300",
                "app.abuse-protection.auth-login.cooldown-seconds=0",
                "app.abuse-protection.auth-password-change.max-requests=2",
                "app.abuse-protection.auth-password-change.window-seconds=300",
                "app.abuse-protection.auth-password-change.cooldown-seconds=0",
                "app.abuse-protection.contact-requests.max-requests=2",
                "app.abuse-protection.contact-requests.window-seconds=300",
                "app.abuse-protection.contact-requests.cooldown-seconds=0"
        }
)
@AutoConfigureMockMvc
class PublicEndpointRateLimitIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private JdbcTemplate jdbcTemplate;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private PublicEndpointRateLimiter publicEndpointRateLimiter;

    @BeforeEach
    void setUp() {
        publicEndpointRateLimiter.clearAll();
        jdbcTemplate.update("DELETE FROM refresh_tokens");
        jdbcTemplate.update("DELETE FROM password_reset_tokens");
        jdbcTemplate.update("DELETE FROM contact_requests");
        jdbcTemplate.update("DELETE FROM admins");
    }

    @Test
    void loginShouldRateLimitRepeatedRequestsFromSameIp() throws Exception {
        insertAdmin("abuse.login@example.com", "AdminPass123!");

        String body = """
                {
                  "email":"abuse.login@example.com",
                  "password":"WrongPass123!"
                }
                """;

        mockMvc.perform(post("/api/auth/login")
                        .header("X-Forwarded-For", "203.0.113.10")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isUnauthorized());

        mockMvc.perform(post("/api/auth/login")
                        .header("X-Forwarded-For", "203.0.113.10")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isUnauthorized());

        mockMvc.perform(post("/api/auth/login")
                        .header("X-Forwarded-For", "203.0.113.10")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isUnauthorized());

        mockMvc.perform(post("/api/auth/login")
                        .header("X-Forwarded-For", "203.0.113.10")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isTooManyRequests())
                .andExpect(header().exists(HttpHeaders.RETRY_AFTER))
                .andExpect(jsonPath("$.message").value("Too many requests. Please try again later."))
                .andExpect(jsonPath("$.code").value("RATE_LIMIT_EXCEEDED"))
                .andExpect(jsonPath("$.retryAfterSeconds").isNumber());

        mockMvc.perform(post("/api/auth/login")
                        .header("X-Forwarded-For", "203.0.113.11")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void contactRequestsShouldRateLimitRepeatedSubmissionsFromSameIp() throws Exception {
        String body = """
                {
                  "category":"GENERAL_SUPPORT",
                  "name":"Alex Johnson",
                  "email":"alex@example.com",
                  "message":"Need help with account access."
                }
                """;

        mockMvc.perform(post("/api/contact-requests")
                        .header("X-Forwarded-For", "198.51.100.7")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isCreated());

        mockMvc.perform(post("/api/contact-requests")
                        .header("X-Forwarded-For", "198.51.100.7")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isCreated());

        mockMvc.perform(post("/api/contact-requests")
                        .header("X-Forwarded-For", "198.51.100.7")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isTooManyRequests())
                .andExpect(header().exists(HttpHeaders.RETRY_AFTER))
                .andExpect(jsonPath("$.message").value("Too many requests. Please try again later."))
                .andExpect(jsonPath("$.code").value("RATE_LIMIT_EXCEEDED"))
                .andExpect(jsonPath("$.retryAfterSeconds").isNumber());

        Integer savedCount = jdbcTemplate.queryForObject("SELECT COUNT(*) FROM contact_requests", Integer.class);
        assertEquals(2, savedCount == null ? 0 : savedCount);
    }

    @Test
    void adminCredentialUpdatesShouldRateLimitCurrentPasswordAttempts() throws Exception {
        String email = "abuse.credentials@example.com";
        String password = "AdminPass123!";
        insertAdmin(email, password);
        String accessToken = loginAndExtractToken(email, password);
        String body = """
                {
                  "email":"new-admin@example.com",
                  "currentPassword":"WrongPass123!",
                  "newPassword":"AdminPass456!"
                }
                """;

        for (int attempt = 0; attempt < 2; attempt++) {
            mockMvc.perform(patch("/api/admin/account/credentials")
                            .header("Authorization", "Bearer " + accessToken)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(body))
                    .andExpect(status().isBadRequest())
                    .andExpect(jsonPath("$.message").value("Current password is incorrect"));
        }

        mockMvc.perform(patch("/api/admin/account/credentials")
                        .header("Authorization", "Bearer " + accessToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isTooManyRequests())
                .andExpect(header().exists(HttpHeaders.RETRY_AFTER))
                .andExpect(jsonPath("$.code").value("RATE_LIMIT_EXCEEDED"));
    }

    private void insertAdmin(String email, String password) {
        LocalDateTime now = LocalDateTime.now();
        jdbcTemplate.update("""
                        INSERT INTO admins
                        (email, password_hash, created_at, updated_at)
                        VALUES (?, ?, ?, ?)
                        """,
                email,
                passwordEncoder.encode(password),
                Timestamp.valueOf(now),
                Timestamp.valueOf(now)
        );
    }

    private String loginAndExtractToken(String email, String password) throws Exception {
        String body = objectMapper.writeValueAsString(new LoginBody(email, password));
        MvcResult result = mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isOk())
                .andReturn();

        JsonNode response = objectMapper.readTree(result.getResponse().getContentAsString());
        return response.get("accessToken").asText();
    }

    private record LoginBody(String email, String password) {}
}

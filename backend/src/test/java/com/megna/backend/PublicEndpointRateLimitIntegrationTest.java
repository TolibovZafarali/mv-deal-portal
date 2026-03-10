package com.megna.backend;

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

import java.sql.Timestamp;
import java.time.LocalDateTime;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest(
        webEnvironment = SpringBootTest.WebEnvironment.MOCK,
        properties = {
                "app.abuse-protection.enabled=true",
                "app.abuse-protection.auth-login.max-requests=2",
                "app.abuse-protection.auth-login.window-seconds=300",
                "app.abuse-protection.contact-requests.max-requests=2",
                "app.abuse-protection.contact-requests.window-seconds=300"
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
                .andExpect(status().isTooManyRequests())
                .andExpect(header().exists(HttpHeaders.RETRY_AFTER))
                .andExpect(jsonPath("$.message").value("Too many requests. Please try again later."));

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
                .andExpect(jsonPath("$.message").value("Too many requests. Please try again later."));

        Integer savedCount = jdbcTemplate.queryForObject("SELECT COUNT(*) FROM contact_requests", Integer.class);
        assertEquals(2, savedCount == null ? 0 : savedCount);
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
}

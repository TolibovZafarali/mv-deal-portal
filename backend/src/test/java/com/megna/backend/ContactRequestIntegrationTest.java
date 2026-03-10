package com.megna.backend;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.megna.backend.domain.entity.Admin;
import com.megna.backend.domain.repository.AdminRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import java.sql.Timestamp;
import java.time.LocalDateTime;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.MOCK)
@AutoConfigureMockMvc
class ContactRequestIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private JdbcTemplate jdbcTemplate;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Autowired
    private AdminRepository adminRepository;

    @BeforeEach
    void setUp() {
        jdbcTemplate.update("DELETE FROM contact_requests");
        jdbcTemplate.update("DELETE FROM refresh_tokens");
        jdbcTemplate.update("DELETE FROM admins");
    }

    @Test
    void publicContactRequestSubmitShouldPersistWithoutAuthentication() throws Exception {
        String body = """
                {
                  "category":"GENERAL_SUPPORT",
                  "name":"Alex Johnson",
                  "email":"alex@example.com",
                  "message":"Need help with account access."
                }
                """;

        mockMvc.perform(post("/api/contact-requests")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.category").value("GENERAL_SUPPORT"))
                .andExpect(jsonPath("$.status").value("NEW"))
                .andExpect(jsonPath("$.name").value("Alex Johnson"))
                .andExpect(jsonPath("$.email").value("alex@example.com"))
                .andExpect(jsonPath("$.messageBody").value("Need help with account access."));
    }

    @Test
    void adminCanListAndReplyToContactRequests() throws Exception {
        long requestId = seedContactRequest();
        String token = seedAdminAndLogin("contact.admin@example.com", "AdminPass123!");

        mockMvc.perform(get("/api/admin/contact-requests")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content.length()").value(1))
                .andExpect(jsonPath("$.content[0].id").value(requestId))
                .andExpect(jsonPath("$.content[0].status").value("NEW"));

        mockMvc.perform(post("/api/admin/contact-requests/{id}/reply", requestId)
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "message":"Thanks for your message. We will follow up shortly."
                                }
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(requestId))
                .andExpect(jsonPath("$.status").value("REPLIED"));
    }

    private long seedContactRequest() {
        jdbcTemplate.update("""
                        INSERT INTO contact_requests
                        (category, name, email, message_body, status, admin_email_status, confirmation_email_status, created_at)
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                        """,
                "GENERAL_SUPPORT",
                "Alex Johnson",
                "alex@example.com",
                "Need help with account access.",
                "NEW",
                "FAILED",
                "FAILED",
                Timestamp.valueOf(LocalDateTime.now())
        );

        Long id = jdbcTemplate.queryForObject("SELECT id FROM contact_requests ORDER BY id DESC LIMIT 1", Long.class);
        return id == null ? 0L : id;
    }

    private String seedAdminAndLogin(String email, String password) throws Exception {
        Admin admin = Admin.builder()
                .email(email)
                .passwordHash(passwordEncoder.encode(password))
                .build();
        adminRepository.save(admin);
        return loginAndExtractToken(email, password);
    }

    private String loginAndExtractToken(String email, String password) throws Exception {
        String body = objectMapper.writeValueAsString(new LoginBody(email, password));

        MvcResult result = mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isOk())
                .andReturn();

        JsonNode node = objectMapper.readTree(result.getResponse().getContentAsString());
        return node.get("accessToken").asText();
    }

    private record LoginBody(String email, String password) {
    }
}

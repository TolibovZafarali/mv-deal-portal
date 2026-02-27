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
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import java.sql.Timestamp;
import java.time.LocalDateTime;

import static org.hamcrest.Matchers.nullValue;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.MOCK)
@AutoConfigureMockMvc
class AuthMeIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private AdminRepository adminRepository;

    @Autowired
    private JdbcTemplate jdbcTemplate;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Autowired
    private ObjectMapper objectMapper;

    @BeforeEach
    void setUp() {
        adminRepository.deleteAll();
        jdbcTemplate.update("DELETE FROM inquiries");
        jdbcTemplate.update("DELETE FROM investors");
    }

    @Test
    void adminLoginTokenShouldResolveAuthMe() throws Exception {
        String email = "admin.integration@example.com";
        String password = "AdminPass123!";

        Admin admin = Admin.builder()
                .email(email)
                .passwordHash(passwordEncoder.encode(password))
                .build();
        admin = adminRepository.save(admin);

        String token = loginAndExtractToken(email, password);

        mockMvc.perform(get("/api/auth/me")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.email").value(email))
                .andExpect(jsonPath("$.userId").value(admin.getId()))
                .andExpect(jsonPath("$.investorId").value(nullValue()))
                .andExpect(jsonPath("$.role").value("ADMIN"))
                .andExpect(jsonPath("$.status").value(nullValue()));
    }

    @Test
    void investorLoginTokenShouldResolveAuthMe() throws Exception {
        String email = "investor.integration@example.com";
        String password = "InvestorPass123!";

        String passwordHash = passwordEncoder.encode(password);
        LocalDateTime now = LocalDateTime.now();

        jdbcTemplate.update("""
                        INSERT INTO investors
                        (first_name, last_name, company_name, email, phone, password_hash, status, rejection_reason, approved_at, created_at, updated_at)
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                        """,
                "Test",
                "Investor",
                "Integration LLC",
                email,
                "+1-555-123-4567",
                passwordHash,
                "APPROVED",
                null,
                Timestamp.valueOf(now),
                Timestamp.valueOf(now),
                Timestamp.valueOf(now)
        );

        Long investorId = jdbcTemplate.queryForObject(
                "SELECT id FROM investors WHERE email = ?",
                Long.class,
                email
        );

        String token = loginAndExtractToken(email, password);

        mockMvc.perform(get("/api/auth/me")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.email").value(email))
                .andExpect(jsonPath("$.userId").value(investorId))
                .andExpect(jsonPath("$.investorId").value(investorId))
                .andExpect(jsonPath("$.role").value("INVESTOR"))
                .andExpect(jsonPath("$.status").value("APPROVED"));
    }

    private String loginAndExtractToken(String email, String password) throws Exception {
        String body = objectMapper.writeValueAsString(new LoginBody(email, password));

        MvcResult loginResult = mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.accessToken").isString())
                .andReturn();

        JsonNode node = objectMapper.readTree(loginResult.getResponse().getContentAsString());
        return node.get("accessToken").asText();
    }

    private record LoginBody(String email, String password) {}
}

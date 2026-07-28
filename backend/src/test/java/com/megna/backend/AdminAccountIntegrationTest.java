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

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.MOCK)
@AutoConfigureMockMvc
class AdminAccountIntegrationTest {

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
        jdbcTemplate.update("DELETE FROM refresh_tokens");
        jdbcTemplate.update("DELETE FROM password_reset_tokens");
        jdbcTemplate.update("DELETE FROM seller_thread_reads");
        jdbcTemplate.update("DELETE FROM seller_thread_messages");
        jdbcTemplate.update("DELETE FROM seller_threads");
        jdbcTemplate.update("DELETE FROM inquiries");
        jdbcTemplate.update("DELETE FROM property_photos");
        jdbcTemplate.update("DELETE FROM photo_assets");
        jdbcTemplate.update("DELETE FROM property_sale_comps");
        jdbcTemplate.update("DELETE FROM properties");
        jdbcTemplate.update("DELETE FROM sellers");
        jdbcTemplate.update("DELETE FROM investors");
        adminRepository.deleteAll();
    }

    @Test
    void adminCanChangeEmailAndPasswordInOneRequest() throws Exception {
        String oldEmail = "admin.old@example.com";
        String newEmail = "admin.new@example.com";
        String currentPassword = "AdminPass123!";
        String newPassword = "AdminPass456!";
        Admin admin = insertAdmin(oldEmail, currentPassword);
        String token = loginAndExtractToken(oldEmail, currentPassword);

        mockMvc.perform(patch("/api/admin/account/credentials")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(
                                new CredentialsBody(newEmail, currentPassword, newPassword)
                        )))
                .andExpect(status().isNoContent());

        Admin updated = adminRepository.findById(admin.getId()).orElseThrow();
        assertEquals(newEmail, updated.getEmail());
        assertTrue(passwordEncoder.matches(newPassword, updated.getPasswordHash()));

        mockMvc.perform(get("/api/auth/me")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isUnauthorized());

        expectLoginFailure(oldEmail, currentPassword);
        expectLoginFailure(newEmail, currentPassword);

        mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(new LoginBody(newEmail, newPassword))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.user.email").value(newEmail))
                .andExpect(jsonPath("$.user.role").value("ADMIN"));
    }

    @Test
    void adminCanChangeEmailWithoutChangingPassword() throws Exception {
        String oldEmail = "email.only.old@example.com";
        String newEmail = "email.only.new@example.com";
        String currentPassword = "AdminPass123!";
        insertAdmin(oldEmail, currentPassword);
        String token = loginAndExtractToken(oldEmail, currentPassword);

        mockMvc.perform(patch("/api/admin/account/credentials")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(
                                new CredentialsBody(newEmail, currentPassword, null)
                        )))
                .andExpect(status().isNoContent());

        expectLoginFailure(oldEmail, currentPassword);
        mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(new LoginBody(newEmail, currentPassword))))
                .andExpect(status().isOk());
    }

    @Test
    void credentialUpdateRejectsWrongCurrentPasswordWithoutChangingAccount() throws Exception {
        String email = "admin.secure@example.com";
        String currentPassword = "AdminPass123!";
        insertAdmin(email, currentPassword);
        String token = loginAndExtractToken(email, currentPassword);

        mockMvc.perform(patch("/api/admin/account/credentials")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(
                                new CredentialsBody("takeover@example.com", "WrongPass123!", "AdminPass456!")
                        )))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("Current password is incorrect"));

        mockMvc.perform(get("/api/auth/me")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.email").value(email));
    }

    @Test
    void credentialUpdateRejectsAnEmailUsedByAnotherRole() throws Exception {
        String adminEmail = "admin.conflict@example.com";
        String investorEmail = "investor.conflict@example.com";
        String password = "AdminPass123!";
        insertAdmin(adminEmail, password);
        insertInvestor(investorEmail);
        String token = loginAndExtractToken(adminEmail, password);

        mockMvc.perform(patch("/api/admin/account/credentials")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(
                                new CredentialsBody(investorEmail, password, null)
                        )))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.message").value("Email already in use"));

        mockMvc.perform(get("/api/auth/me")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk());
    }

    private Admin insertAdmin(String email, String password) {
        return adminRepository.save(Admin.builder()
                .email(email)
                .passwordHash(passwordEncoder.encode(password))
                .build());
    }

    private void insertInvestor(String email) {
        LocalDateTime now = LocalDateTime.now();
        jdbcTemplate.update("""
                        INSERT INTO investors
                        (first_name, last_name, company_name, email, phone, password_hash, status,
                         rejection_reason, approved_at, created_at, updated_at)
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                        """,
                "Conflict",
                "Investor",
                "Conflict LLC",
                email,
                "+1-555-555-0101",
                passwordEncoder.encode("InvestorPass123!"),
                "APPROVED",
                null,
                Timestamp.valueOf(now),
                Timestamp.valueOf(now),
                Timestamp.valueOf(now)
        );
    }

    private String loginAndExtractToken(String email, String password) throws Exception {
        MvcResult result = mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(new LoginBody(email, password))))
                .andExpect(status().isOk())
                .andReturn();

        JsonNode body = objectMapper.readTree(result.getResponse().getContentAsString());
        return body.get("accessToken").asText();
    }

    private void expectLoginFailure(String email, String password) throws Exception {
        mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(new LoginBody(email, password))))
                .andExpect(status().isUnauthorized());
    }

    private record LoginBody(String email, String password) {}

    private record CredentialsBody(String email, String currentPassword, String newPassword) {}
}

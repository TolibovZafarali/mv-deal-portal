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
        jdbcTemplate.update("DELETE FROM property_change_requests");
        jdbcTemplate.update("DELETE FROM inquiries");
        jdbcTemplate.update("DELETE FROM sellers");
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
                .andExpect(jsonPath("$.sellerId").value(nullValue()))
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
                .andExpect(jsonPath("$.sellerId").value(nullValue()))
                .andExpect(jsonPath("$.role").value("INVESTOR"))
                .andExpect(jsonPath("$.status").value("APPROVED"));
    }

    @Test
    void sellerLoginTokenShouldResolveAuthMe() throws Exception {
        String email = "seller.integration@example.com";
        String password = "SellerPass123!";

        String passwordHash = passwordEncoder.encode(password);
        LocalDateTime now = LocalDateTime.now();

        jdbcTemplate.update("""
                        INSERT INTO sellers
                        (first_name, last_name, company_name, email, phone, password_hash, status, created_at, updated_at)
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                        """,
                "Test",
                "Seller",
                "Seller Integration LLC",
                email,
                "+1-555-987-6543",
                passwordHash,
                "ACTIVE",
                Timestamp.valueOf(now),
                Timestamp.valueOf(now)
        );

        Long sellerId = jdbcTemplate.queryForObject(
                "SELECT id FROM sellers WHERE email = ?",
                Long.class,
                email
        );

        String token = loginAndExtractToken(email, password);

        mockMvc.perform(get("/api/auth/me")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.email").value(email))
                .andExpect(jsonPath("$.userId").value(sellerId))
                .andExpect(jsonPath("$.investorId").value(nullValue()))
                .andExpect(jsonPath("$.sellerId").value(sellerId))
                .andExpect(jsonPath("$.role").value("SELLER"))
                .andExpect(jsonPath("$.status").value("ACTIVE"));
    }

    @Test
    void registerSellerShouldRejectEmailUsedByInvestor() throws Exception {
        String email = "dupe.role@example.com";

        LocalDateTime now = LocalDateTime.now();
        jdbcTemplate.update("""
                        INSERT INTO investors
                        (first_name, last_name, company_name, email, phone, password_hash, status, rejection_reason, approved_at, created_at, updated_at)
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                        """,
                "Dup",
                "Investor",
                "Dual Role LLC",
                email,
                "+1-555-444-1212",
                passwordEncoder.encode("InvestorPass123!"),
                "PENDING",
                null,
                null,
                Timestamp.valueOf(now),
                Timestamp.valueOf(now)
        );

        String body = """
                {
                  "firstName":"Role",
                  "lastName":"Conflict",
                  "companyName":"Seller Co",
                  "email":"dupe.role@example.com",
                  "phone":"+1-555-111-9999",
                  "password":"SellerPass123!"
                }
                """;

        mockMvc.perform(post("/api/auth/register/seller")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isConflict());
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

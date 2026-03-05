package com.megna.backend;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
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
class SellerInquiryIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private JdbcTemplate jdbcTemplate;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Autowired
    private ObjectMapper objectMapper;

    @BeforeEach
    void setUp() {
        jdbcTemplate.update("DELETE FROM seller_thread_reads");
        jdbcTemplate.update("DELETE FROM seller_thread_messages");
        jdbcTemplate.update("DELETE FROM seller_threads");
        jdbcTemplate.update("DELETE FROM property_change_requests");
        jdbcTemplate.update("DELETE FROM inquiries");
        jdbcTemplate.update("DELETE FROM property_photos");
        jdbcTemplate.update("DELETE FROM photo_assets");
        jdbcTemplate.update("DELETE FROM property_sale_comps");
        jdbcTemplate.update("DELETE FROM properties");
        jdbcTemplate.update("DELETE FROM sellers");
        jdbcTemplate.update("DELETE FROM investors");
        jdbcTemplate.update("DELETE FROM admins");
    }

    @Test
    void sellerInquiriesShouldReturnItemsForOwnedProperties() throws Exception {
        String sellerEmail = "seller.inbox@example.com";
        String sellerPassword = "SellerPass123!";
        long sellerId = seedSeller(sellerEmail, sellerPassword);

        long propertyId = seedPropertyForSeller(sellerId);
        long investorId = seedInvestor("investor.inbox@example.com");
        seedInquiry(propertyId, investorId);

        String sellerToken = loginAndExtractToken(sellerEmail, sellerPassword);

        mockMvc.perform(get("/api/seller/inquiries")
                        .header("Authorization", "Bearer " + sellerToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content.length()").value(1))
                .andExpect(jsonPath("$.content[0].propertyId").value(propertyId))
                .andExpect(jsonPath("$.content[0].investorId").value(investorId));
    }

    private long seedSeller(String email, String password) {
        LocalDateTime now = LocalDateTime.now();
        jdbcTemplate.update("""
                        INSERT INTO sellers
                        (first_name, last_name, company_name, email, phone, password_hash, status, created_at, updated_at)
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                        """,
                "Seller",
                "Inbox",
                "Inbox LLC",
                email,
                "+1-555-000-1111",
                passwordEncoder.encode(password),
                "ACTIVE",
                Timestamp.valueOf(now),
                Timestamp.valueOf(now)
        );

        Long sellerId = jdbcTemplate.queryForObject("SELECT id FROM sellers WHERE email = ?", Long.class, email);
        return sellerId == null ? 0L : sellerId;
    }

    private long seedInvestor(String email) {
        LocalDateTime now = LocalDateTime.now();
        jdbcTemplate.update("""
                        INSERT INTO investors
                        (first_name, last_name, company_name, email, phone, password_hash, status, rejection_reason, approved_at, created_at, updated_at)
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                        """,
                "Investor",
                "Inbox",
                "Inbox Capital",
                email,
                "+1-555-222-3333",
                passwordEncoder.encode("InvestorPass123!"),
                "APPROVED",
                null,
                Timestamp.valueOf(now),
                Timestamp.valueOf(now),
                Timestamp.valueOf(now)
        );

        Long investorId = jdbcTemplate.queryForObject("SELECT id FROM investors WHERE email = ?", Long.class, email);
        return investorId == null ? 0L : investorId;
    }

    private long seedPropertyForSeller(long sellerId) {
        LocalDateTime now = LocalDateTime.now();
        jdbcTemplate.update("""
                        INSERT INTO properties
                        (status, street_1, city, state, zip, seller_id, seller_workflow_status, created_at, updated_at)
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                        """,
                "ACTIVE",
                "100 Main St",
                "St. Louis",
                "MO",
                "63101",
                sellerId,
                "PUBLISHED",
                Timestamp.valueOf(now),
                Timestamp.valueOf(now)
        );

        Long propertyId = jdbcTemplate.queryForObject("SELECT id FROM properties WHERE seller_id = ? ORDER BY id DESC LIMIT 1", Long.class, sellerId);
        return propertyId == null ? 0L : propertyId;
    }

    private void seedInquiry(long propertyId, long investorId) {
        LocalDateTime now = LocalDateTime.now();
        jdbcTemplate.update("""
                        INSERT INTO inquiries
                        (property_id, investor_id, subject, message_body, contact_name, company_name, contact_email, contact_phone, email_status, created_at)
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                        """,
                propertyId,
                investorId,
                "Interested",
                "Can we discuss terms?",
                "Investor Inbox",
                "Inbox Capital",
                "investor.inbox@example.com",
                "+1-555-222-3333",
                "SENT",
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

        JsonNode node = objectMapper.readTree(result.getResponse().getContentAsString());
        return node.get("accessToken").asText();
    }

    private record LoginBody(String email, String password) {
    }
}

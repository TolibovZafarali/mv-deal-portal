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
class SellerDashboardSummaryIntegrationTest {

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
    void sellerDashboardSummaryShouldReturnWorkflowCounts() throws Exception {
        String sellerEmail = "seller.summary@example.com";
        String sellerPassword = "SellerPass123!";
        long sellerId = seedSeller(sellerEmail, sellerPassword);

        seedProperty(sellerId, "DRAFT");
        seedProperty(sellerId, "SUBMITTED");
        seedProperty(sellerId, "CHANGES_REQUESTED");
        seedProperty(sellerId, "PUBLISHED");

        long propertyIdForRequest = seedProperty(sellerId, "PUBLISHED");
        seedOpenChangeRequest(propertyIdForRequest, sellerId);

        String token = loginAndExtractToken(sellerEmail, sellerPassword);

        mockMvc.perform(get("/api/seller/dashboard/summary")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.drafts").value(1))
                .andExpect(jsonPath("$.submitted").value(1))
                .andExpect(jsonPath("$.changesRequested").value(1))
                .andExpect(jsonPath("$.published").value(2))
                .andExpect(jsonPath("$.openRequests").value(1));
    }

    private long seedSeller(String email, String password) {
        LocalDateTime now = LocalDateTime.now();
        jdbcTemplate.update("""
                        INSERT INTO sellers
                        (first_name, last_name, company_name, email, phone, password_hash, status, created_at, updated_at)
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                        """,
                "Seller",
                "Summary",
                "Summary LLC",
                email,
                "+1-555-101-2020",
                passwordEncoder.encode(password),
                "ACTIVE",
                Timestamp.valueOf(now),
                Timestamp.valueOf(now)
        );

        Long sellerId = jdbcTemplate.queryForObject("SELECT id FROM sellers WHERE email = ?", Long.class, email);
        return sellerId == null ? 0L : sellerId;
    }

    private long seedProperty(long sellerId, String workflow) {
        LocalDateTime now = LocalDateTime.now();
        jdbcTemplate.update("""
                        INSERT INTO properties
                        (status, street_1, city, state, zip, seller_id, seller_workflow_status, created_at, updated_at)
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                        """,
                "DRAFT",
                "200 Market St",
                "St. Louis",
                "MO",
                "63102",
                sellerId,
                workflow,
                Timestamp.valueOf(now),
                Timestamp.valueOf(now)
        );

        Long propertyId = jdbcTemplate.queryForObject("SELECT id FROM properties WHERE seller_id = ? ORDER BY id DESC LIMIT 1", Long.class, sellerId);
        return propertyId == null ? 0L : propertyId;
    }

    private void seedOpenChangeRequest(long propertyId, long sellerId) {
        LocalDateTime now = LocalDateTime.now();
        jdbcTemplate.update("""
                        INSERT INTO property_change_requests
                        (property_id, seller_id, requested_changes, status, admin_note, created_at, updated_at, resolved_at, resolved_by_admin_id)
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                        """,
                propertyId,
                sellerId,
                "Update listing photos",
                "OPEN",
                null,
                Timestamp.valueOf(now),
                Timestamp.valueOf(now),
                null,
                null
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

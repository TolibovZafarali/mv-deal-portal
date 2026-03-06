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
class PropertyPaginationIntegrationTest {

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
    void adminSearchShouldReturnStablePaginationMetadataForListUis() throws Exception {
        String adminEmail = "admin.pagination@example.com";
        String adminPassword = "AdminPass123!";
        seedAdmin(adminEmail, adminPassword);
        String adminToken = loginAndExtractToken(adminEmail, adminPassword);

        LocalDateTime base = LocalDateTime.now().minusHours(1);
        for (int i = 1; i <= 25; i++) {
            seedAdminProperty("Admin Page Property %02d".formatted(i), base.plusSeconds(i));
        }

        mockMvc.perform(get("/api/properties/search")
                        .param("status", "DRAFT")
                        .param("page", "1")
                        .param("size", "10")
                        .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.number").value(1))
                .andExpect(jsonPath("$.size").value(10))
                .andExpect(jsonPath("$.numberOfElements").value(10))
                .andExpect(jsonPath("$.totalElements").value(25))
                .andExpect(jsonPath("$.totalPages").value(3))
                .andExpect(jsonPath("$.first").value(false))
                .andExpect(jsonPath("$.last").value(false))
                .andExpect(jsonPath("$.content[0].street1").value("Admin Page Property 15"));
    }

    @Test
    void sellerPropertiesShouldPageWithinSellerScope() throws Exception {
        String sellerEmail = "seller.pagination@example.com";
        String sellerPassword = "SellerPass123!";
        long sellerId = seedSeller(sellerEmail, sellerPassword);
        String otherSellerEmail = "seller.pagination.other@example.com";
        long otherSellerId = seedSeller(otherSellerEmail, "SellerPass123!");
        String sellerToken = loginAndExtractToken(sellerEmail, sellerPassword);

        LocalDateTime base = LocalDateTime.now().minusHours(2);
        for (int i = 1; i <= 12; i++) {
            seedSellerProperty("Seller A Property %02d".formatted(i), sellerId, base.plusSeconds(i));
        }
        for (int i = 1; i <= 3; i++) {
            seedSellerProperty("Seller B Property %02d".formatted(i), otherSellerId, base.plusSeconds(100 + i));
        }

        mockMvc.perform(get("/api/seller/properties")
                        .param("page", "2")
                        .param("size", "5")
                        .header("Authorization", "Bearer " + sellerToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.number").value(2))
                .andExpect(jsonPath("$.size").value(5))
                .andExpect(jsonPath("$.numberOfElements").value(2))
                .andExpect(jsonPath("$.totalElements").value(12))
                .andExpect(jsonPath("$.totalPages").value(3))
                .andExpect(jsonPath("$.first").value(false))
                .andExpect(jsonPath("$.last").value(true))
                .andExpect(jsonPath("$.content[0].sellerId").value(sellerId))
                .andExpect(jsonPath("$.content[1].sellerId").value(sellerId));
    }

    private void seedAdmin(String email, String password) {
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

    private long seedSeller(String email, String password) {
        LocalDateTime now = LocalDateTime.now();
        jdbcTemplate.update("""
                        INSERT INTO sellers
                        (first_name, last_name, company_name, email, phone, password_hash, status, created_at, updated_at)
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                        """,
                "Seller",
                "Pagination",
                "Pagination LLC",
                email,
                "+1-555-333-7777",
                passwordEncoder.encode(password),
                "ACTIVE",
                Timestamp.valueOf(now),
                Timestamp.valueOf(now)
        );

        Long sellerId = jdbcTemplate.queryForObject(
                "SELECT id FROM sellers WHERE email = ?",
                Long.class,
                email
        );
        return sellerId == null ? 0L : sellerId;
    }

    private void seedAdminProperty(String street1, LocalDateTime createdAt) {
        jdbcTemplate.update("""
                        INSERT INTO properties
                        (status, street_1, city, state, zip, created_at, updated_at)
                        VALUES (?, ?, ?, ?, ?, ?, ?)
                        """,
                "DRAFT",
                street1,
                "St. Louis",
                "MO",
                "63102",
                Timestamp.valueOf(createdAt),
                Timestamp.valueOf(createdAt)
        );
    }

    private void seedSellerProperty(String street1, long sellerId, LocalDateTime createdAt) {
        jdbcTemplate.update("""
                        INSERT INTO properties
                        (status, street_1, city, state, zip, seller_id, seller_workflow_status, created_at, updated_at)
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                        """,
                "DRAFT",
                street1,
                "St. Louis",
                "MO",
                "63102",
                sellerId,
                "DRAFT",
                Timestamp.valueOf(createdAt),
                Timestamp.valueOf(createdAt)
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

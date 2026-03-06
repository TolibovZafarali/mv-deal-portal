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

import static org.hamcrest.Matchers.hasItems;
import static org.hamcrest.Matchers.not;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.MOCK)
@AutoConfigureMockMvc
class AdminPropertyVisibilityIntegrationTest {

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
    void adminDraftSearchShouldHideSellerDraftsUntilSubmission() throws Exception {
        String token = createAdminAndLogin();
        long sellerId = seedSeller("seller.visibility@example.com", "SellerPass123!");

        seedProperty("Admin Draft Visible", null, null, "DRAFT");
        seedProperty("Seller Draft Hidden", sellerId, "DRAFT", "DRAFT");
        seedProperty("Seller Submitted Visible", sellerId, "SUBMITTED", "DRAFT");

        mockMvc.perform(get("/api/properties/search")
                        .param("status", "DRAFT")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalElements").value(2))
                .andExpect(jsonPath("$.content[*].street1", hasItems(
                        "Admin Draft Visible",
                        "Seller Submitted Visible"
                )))
                .andExpect(jsonPath("$.content[*].street1", not(hasItems("Seller Draft Hidden"))));
    }

    @Test
    void adminShouldNotLoadSellerDraftByIdBeforeSubmission() throws Exception {
        String token = createAdminAndLogin();
        long sellerId = seedSeller("seller.detail@example.com", "SellerPass123!");

        long hiddenDraftId = seedProperty("Seller Draft Hidden", sellerId, "DRAFT", "DRAFT");
        long submittedDraftId = seedProperty("Seller Submitted Visible", sellerId, "SUBMITTED", "DRAFT");

        mockMvc.perform(get("/api/properties/{id}", hiddenDraftId)
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isNotFound());

        mockMvc.perform(get("/api/properties/{id}", submittedDraftId)
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.street1").value("Seller Submitted Visible"));
    }

    @Test
    void adminQueueSummaryShouldExcludeSellerOnlyDrafts() throws Exception {
        String token = createAdminAndLogin();
        long sellerId = seedSeller("seller.queue@example.com", "SellerPass123!");

        seedProperty("Admin Draft Visible", null, null, "DRAFT");
        seedProperty("Seller Draft Hidden", sellerId, "DRAFT", "DRAFT");
        seedProperty("Seller Submitted Visible", sellerId, "SUBMITTED", "DRAFT");

        mockMvc.perform(get("/api/admin/queue/summary")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.draftProperties").value(2))
                .andExpect(jsonPath("$.submittedProperties").value(1));
    }

    private String createAdminAndLogin() throws Exception {
        String email = "admin.visibility@example.com";
        String password = "AdminPass123!";

        Admin admin = Admin.builder()
                .email(email)
                .passwordHash(passwordEncoder.encode(password))
                .build();
        adminRepository.save(admin);

        return loginAndExtractToken(email, password);
    }

    private long seedSeller(String email, String password) {
        LocalDateTime now = LocalDateTime.now();
        jdbcTemplate.update("""
                        INSERT INTO sellers
                        (first_name, last_name, company_name, email, phone, password_hash, status, created_at, updated_at)
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                        """,
                "Seller",
                "Visibility",
                "Visibility LLC",
                email,
                "+1-555-201-3030",
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

    private long seedProperty(String street1, Long sellerId, String sellerWorkflowStatus, String status) {
        LocalDateTime now = LocalDateTime.now();
        jdbcTemplate.update("""
                        INSERT INTO properties
                        (status, street_1, city, state, zip, seller_id, seller_workflow_status, created_at, updated_at)
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                        """,
                status,
                street1,
                "St. Louis",
                "MO",
                "63102",
                sellerId,
                sellerWorkflowStatus,
                Timestamp.valueOf(now),
                Timestamp.valueOf(now)
        );

        Long propertyId = jdbcTemplate.queryForObject(
                "SELECT id FROM properties WHERE street_1 = ? ORDER BY id DESC LIMIT 1",
                Long.class,
                street1
        );
        return propertyId == null ? 0L : propertyId;
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

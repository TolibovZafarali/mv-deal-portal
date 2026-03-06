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
class InquiryAdminReplyIntegrationTest {

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
        jdbcTemplate.update("DELETE FROM inquiry_admin_replies");
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
    void adminCanCreateAndListInquiryReplies() throws Exception {
        String adminEmail = "admin.reply@example.com";
        String adminPassword = "AdminPass123!";
        long adminId = seedAdmin(adminEmail, adminPassword);
        long investorId = seedInvestor("investor.reply@example.com");
        long propertyId = seedProperty("ACTIVE");
        seedInquiry(propertyId, investorId, "investor.reply@example.com", LocalDateTime.now().minusMinutes(2));

        String adminToken = loginAndExtractToken(adminEmail, adminPassword);

        mockMvc.perform(post("/api/admin/inquiry-replies")
                        .header("Authorization", "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(new ReplyCreateBody(investorId, propertyId, "Thanks, we received your inquiry."))))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.investorId").value(investorId))
                .andExpect(jsonPath("$.propertyId").value(propertyId))
                .andExpect(jsonPath("$.body").value("Thanks, we received your inquiry."))
                .andExpect(jsonPath("$.emailStatus").exists());

        mockMvc.perform(get("/api/admin/inquiry-replies")
                        .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content.length()").value(1))
                .andExpect(jsonPath("$.content[0].investorId").value(investorId))
                .andExpect(jsonPath("$.content[0].propertyId").value(propertyId))
                .andExpect(jsonPath("$.content[0].body").value("Thanks, we received your inquiry."));

        Long storedAdminId = jdbcTemplate.queryForObject(
                "SELECT admin_id FROM inquiry_admin_replies ORDER BY id DESC LIMIT 1",
                Long.class
        );
        org.junit.jupiter.api.Assertions.assertEquals(adminId, storedAdminId);
    }

    @Test
    void investorByInvestorEndpointReturnsOnlyActivePropertyReplies() throws Exception {
        String adminEmail = "admin.reply.filter@example.com";
        String adminPassword = "AdminPass123!";
        seedAdmin(adminEmail, adminPassword);
        long investorId = seedInvestor("investor.filter@example.com");
        long activePropertyId = seedProperty("ACTIVE");
        long closedPropertyId = seedProperty("CLOSED");
        seedInquiry(activePropertyId, investorId, "investor.filter@example.com", LocalDateTime.now().minusMinutes(5));
        seedInquiry(closedPropertyId, investorId, "investor.filter@example.com", LocalDateTime.now().minusMinutes(4));

        String adminToken = loginAndExtractToken(adminEmail, adminPassword);

        mockMvc.perform(post("/api/admin/inquiry-replies")
                        .header("Authorization", "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(new ReplyCreateBody(investorId, activePropertyId, "Reply for active thread"))))
                .andExpect(status().isCreated());

        mockMvc.perform(post("/api/admin/inquiry-replies")
                        .header("Authorization", "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(new ReplyCreateBody(investorId, closedPropertyId, "Reply for closed thread"))))
                .andExpect(status().isCreated());

        String investorToken = loginAndExtractToken("investor.filter@example.com", "InvestorPass123!");

        mockMvc.perform(get("/api/inquiry-replies/by-investor/{investorId}", investorId)
                        .header("Authorization", "Bearer " + investorToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content.length()").value(1))
                .andExpect(jsonPath("$.content[0].propertyId").value(activePropertyId))
                .andExpect(jsonPath("$.content[0].body").value("Reply for active thread"));
    }

    @Test
    void investorCannotUseAdminInquiryReplyEndpoints() throws Exception {
        String adminEmail = "admin.reply.forbidden@example.com";
        String adminPassword = "AdminPass123!";
        seedAdmin(adminEmail, adminPassword);
        long investorId = seedInvestor("investor.forbidden@example.com");
        long propertyId = seedProperty("ACTIVE");
        seedInquiry(propertyId, investorId, "investor.forbidden@example.com", LocalDateTime.now().minusMinutes(1));

        String investorToken = loginAndExtractToken("investor.forbidden@example.com", "InvestorPass123!");

        mockMvc.perform(get("/api/admin/inquiry-replies")
                        .header("Authorization", "Bearer " + investorToken))
                .andExpect(status().isForbidden());

        mockMvc.perform(post("/api/admin/inquiry-replies")
                        .header("Authorization", "Bearer " + investorToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(new ReplyCreateBody(investorId, propertyId, "No access"))))
                .andExpect(status().isForbidden());
    }

    private long seedAdmin(String email, String password) {
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
        Long id = jdbcTemplate.queryForObject("SELECT id FROM admins WHERE email = ?", Long.class, email);
        return id == null ? 0L : id;
    }

    private long seedInvestor(String email) {
        LocalDateTime now = LocalDateTime.now();
        jdbcTemplate.update("""
                        INSERT INTO investors
                        (first_name, last_name, company_name, email, notification_email, phone, password_hash, status, rejection_reason, approved_at, created_at, updated_at)
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                        """,
                "Investor",
                "Reply",
                "Reply Capital",
                email,
                email,
                "+1-555-300-2222",
                passwordEncoder.encode("InvestorPass123!"),
                "APPROVED",
                null,
                Timestamp.valueOf(now),
                Timestamp.valueOf(now),
                Timestamp.valueOf(now)
        );
        Long id = jdbcTemplate.queryForObject("SELECT id FROM investors WHERE email = ?", Long.class, email);
        return id == null ? 0L : id;
    }

    private long seedProperty(String status) {
        LocalDateTime now = LocalDateTime.now();
        jdbcTemplate.update("""
                        INSERT INTO properties
                        (status, street_1, city, state, zip, created_at, updated_at)
                        VALUES (?, ?, ?, ?, ?, ?, ?)
                        """,
                status,
                "101 Reply St",
                "St. Louis",
                "MO",
                "63101",
                Timestamp.valueOf(now),
                Timestamp.valueOf(now)
        );
        Long id = jdbcTemplate.queryForObject("SELECT id FROM properties ORDER BY id DESC LIMIT 1", Long.class);
        return id == null ? 0L : id;
    }

    private void seedInquiry(long propertyId, long investorId, String contactEmail, LocalDateTime createdAt) {
        jdbcTemplate.update("""
                        INSERT INTO inquiries
                        (property_id, investor_id, subject, message_body, contact_name, company_name, contact_email, contact_phone, email_status, created_at)
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                        """,
                propertyId,
                investorId,
                "Message about property",
                "Investor asks for details.",
                "Investor Reply",
                "Reply Capital",
                contactEmail,
                "+1-555-300-2222",
                "SENT",
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

    private record ReplyCreateBody(Long investorId, Long propertyId, String body) {
    }
}

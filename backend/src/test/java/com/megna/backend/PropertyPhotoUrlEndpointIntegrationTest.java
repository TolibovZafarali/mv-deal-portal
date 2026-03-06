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

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.MOCK)
@AutoConfigureMockMvc
class PropertyPhotoUrlEndpointIntegrationTest {

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
    void createPhotoFromUrlShouldReturnForbiddenForInvestorToken() throws Exception {
        String email = "investor.photo-url@example.com";
        String password = "InvestorPass123!";
        seedApprovedInvestor(email, password);
        String token = loginAndExtractToken(email, password);

        mockMvc.perform(post("/api/properties/photos/urls")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "url": "https://example.com/photo.jpg"
                                }
                                """))
                .andExpect(status().isForbidden());
    }

    @Test
    void sellerCreatePhotoFromUrlShouldPersistOwnedReadyAsset() throws Exception {
        String sellerEmail = "seller.photo-url@example.com";
        String sellerPassword = "SellerPass123!";
        long sellerId = seedActiveSeller(sellerEmail, sellerPassword);
        String sellerToken = loginAndExtractToken(sellerEmail, sellerPassword);

        MvcResult result = mockMvc.perform(post("/api/seller/properties/photos/urls")
                        .header("Authorization", "Bearer " + sellerToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "url": " https://example.com/seller-photo.jpg "
                                }
                                """))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.url").value("https://example.com/seller-photo.jpg"))
                .andExpect(jsonPath("$.thumbnailUrl").value("https://example.com/seller-photo.jpg"))
                .andReturn();

        JsonNode node = objectMapper.readTree(result.getResponse().getContentAsString());
        String photoAssetId = node.get("photoAssetId").asText();

        Long storedSellerId = jdbcTemplate.queryForObject(
                "SELECT created_by_seller_id FROM photo_assets WHERE id = ?",
                Long.class,
                photoAssetId
        );
        String storedStatus = jdbcTemplate.queryForObject(
                "SELECT status FROM photo_assets WHERE id = ?",
                String.class,
                photoAssetId
        );

        assertEquals(sellerId, storedSellerId);
        assertEquals("READY", storedStatus);
    }

    @Test
    void adminDeleteUnboundUploadShouldMarkAssetDeleted() throws Exception {
        String adminEmail = "admin.photo-delete@example.com";
        String adminPassword = "AdminPass123!";
        long adminId = seedAdmin(adminEmail, adminPassword);
        String adminToken = loginAndExtractToken(adminEmail, adminPassword);
        String uploadId = "upload-delete-admin-1";
        seedPhotoAsset(uploadId, adminId, null, "READY");

        mockMvc.perform(delete("/api/properties/photos/uploads/{uploadId}", uploadId)
                        .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isNoContent());

        String statusValue = jdbcTemplate.queryForObject(
                "SELECT status FROM photo_assets WHERE id = ?",
                String.class,
                uploadId
        );
        Timestamp deletedAt = jdbcTemplate.queryForObject(
                "SELECT deleted_at FROM photo_assets WHERE id = ?",
                Timestamp.class,
                uploadId
        );

        assertEquals("DELETED", statusValue);
        assertNotNull(deletedAt);
    }

    @Test
    void adminDeleteUnboundUploadShouldReturnConflictWhenAlreadyAttached() throws Exception {
        String adminEmail = "admin.photo-attached@example.com";
        String adminPassword = "AdminPass123!";
        long adminId = seedAdmin(adminEmail, adminPassword);
        String adminToken = loginAndExtractToken(adminEmail, adminPassword);
        long propertyId = seedProperty("Photo Attachment Test");
        String uploadId = "upload-attached-admin-1";

        seedPhotoAsset(uploadId, adminId, null, "READY");
        seedPropertyPhoto(propertyId, uploadId);

        mockMvc.perform(delete("/api/properties/photos/uploads/{uploadId}", uploadId)
                        .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isConflict());

        String statusValue = jdbcTemplate.queryForObject(
                "SELECT status FROM photo_assets WHERE id = ?",
                String.class,
                uploadId
        );
        assertEquals("READY", statusValue);
    }

    private void seedApprovedInvestor(String email, String password) {
        String passwordHash = passwordEncoder.encode(password);
        LocalDateTime now = LocalDateTime.now();

        jdbcTemplate.update("""
                        INSERT INTO investors
                        (first_name, last_name, company_name, email, phone, password_hash, status, rejection_reason, approved_at, created_at, updated_at)
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                        """,
                "Photo",
                "Investor",
                "Photo URL LLC",
                email,
                "+1-555-020-3030",
                passwordHash,
                "APPROVED",
                null,
                Timestamp.valueOf(now),
                Timestamp.valueOf(now),
                Timestamp.valueOf(now)
        );
    }

    private long seedActiveSeller(String email, String password) {
        LocalDateTime now = LocalDateTime.now();
        jdbcTemplate.update("""
                        INSERT INTO sellers
                        (first_name, last_name, company_name, email, phone, password_hash, status, created_at, updated_at)
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                        """,
                "Photo",
                "Seller",
                "Photo Seller LLC",
                email,
                "+1-555-111-2222",
                passwordEncoder.encode(password),
                "ACTIVE",
                Timestamp.valueOf(now),
                Timestamp.valueOf(now)
        );

        Long sellerId = jdbcTemplate.queryForObject("SELECT id FROM sellers WHERE email = ?", Long.class, email);
        return sellerId == null ? 0L : sellerId;
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
        Long adminId = jdbcTemplate.queryForObject("SELECT id FROM admins WHERE email = ?", Long.class, email);
        return adminId == null ? 0L : adminId;
    }

    private long seedProperty(String street1) {
        LocalDateTime now = LocalDateTime.now();
        jdbcTemplate.update("""
                        INSERT INTO properties
                        (status, street_1, city, state, zip, created_at, updated_at)
                        VALUES (?, ?, ?, ?, ?, ?, ?)
                        """,
                "DRAFT",
                street1,
                "St. Louis",
                "MO",
                "63101",
                Timestamp.valueOf(now),
                Timestamp.valueOf(now)
        );
        Long propertyId = jdbcTemplate.queryForObject("SELECT id FROM properties WHERE street_1 = ? ORDER BY id DESC LIMIT 1", Long.class, street1);
        return propertyId == null ? 0L : propertyId;
    }

    private void seedPhotoAsset(String uploadId, Long adminId, Long sellerId, String status) {
        LocalDateTime now = LocalDateTime.now();
        jdbcTemplate.update("""
                        INSERT INTO photo_assets
                        (id, created_by_admin_id, created_by_seller_id, status, url, thumbnail_url, retry_count, created_at, updated_at)
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                        """,
                uploadId,
                adminId,
                sellerId,
                status,
                "https://example.com/" + uploadId + ".jpg",
                "https://example.com/" + uploadId + "-thumb.jpg",
                0,
                Timestamp.valueOf(now.minusMinutes(1)),
                Timestamp.valueOf(now.minusMinutes(1))
        );
    }

    private void seedPropertyPhoto(long propertyId, String photoAssetId) {
        LocalDateTime now = LocalDateTime.now();
        jdbcTemplate.update("""
                        INSERT INTO property_photos
                        (property_id, url, thumbnail_url, photo_asset_id, sort_order, caption, created_at)
                        VALUES (?, ?, ?, ?, ?, ?, ?)
                        """,
                propertyId,
                "https://example.com/" + photoAssetId + ".jpg",
                "https://example.com/" + photoAssetId + "-thumb.jpg",
                photoAssetId,
                0,
                "Front",
                Timestamp.valueOf(now)
        );
    }

    private String loginAndExtractToken(String email, String password) throws Exception {
        String body = objectMapper.writeValueAsString(new LoginBody(email, password));

        MvcResult loginResult = mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isOk())
                .andReturn();

        JsonNode node = objectMapper.readTree(loginResult.getResponse().getContentAsString());
        return node.get("accessToken").asText();
    }

    private record LoginBody(String email, String password) {}
}

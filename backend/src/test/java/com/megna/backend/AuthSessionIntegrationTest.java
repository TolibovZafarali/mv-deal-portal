package com.megna.backend;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.http.Cookie;
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

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.sql.Timestamp;
import java.time.LocalDateTime;
import java.util.HexFormat;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest(
        webEnvironment = SpringBootTest.WebEnvironment.MOCK,
        properties = "app.auth.refresh-cookie-domain=megna-realestate.com"
)
@AutoConfigureMockMvc
class AuthSessionIntegrationTest {

    private static final String REFRESH_COOKIE_NAME = "mv_refresh_token";

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
        jdbcTemplate.update("DELETE FROM refresh_tokens");
        jdbcTemplate.update("DELETE FROM password_reset_tokens");
        jdbcTemplate.update("DELETE FROM inquiries");
        jdbcTemplate.update("DELETE FROM sellers");
        jdbcTemplate.update("DELETE FROM investors");
        jdbcTemplate.update("DELETE FROM admins");
    }

    @Test
    void loginShouldReturnAccessTokenAndSetRefreshCookie() throws Exception {
        String email = "session.login@example.com";
        String password = "AdminPass123!";
        insertAdmin(email, password);

        SessionResponse session = loginAndExtractSession(email, password);

        assertNotNull(session.accessToken());
        assertNotNull(session.refreshCookie());
        assertEquals(REFRESH_COOKIE_NAME, session.refreshCookie().getName());
        assertEquals("megna-realestate.com", session.refreshCookie().getDomain());
        assertEquals("/api/auth", session.refreshCookie().getPath());
        assertEquals(true, session.refreshCookie().isHttpOnly());
    }

    @Test
    void refreshShouldRotateRefreshTokenAndRejectReuse() throws Exception {
        String email = "session.refresh@example.com";
        String password = "AdminPass123!";
        insertAdmin(email, password);

        SessionResponse loginSession = loginAndExtractSession(email, password);

        MvcResult refreshResult = mockMvc.perform(post("/api/auth/refresh")
                        .cookie(new Cookie(REFRESH_COOKIE_NAME, loginSession.refreshCookie().getValue())))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.accessToken").isString())
                .andExpect(jsonPath("$.user").exists())
                .andExpect(jsonPath("$.user.role").value("ADMIN"))
                .andReturn();

        Cookie rotatedCookie = refreshResult.getResponse().getCookie(REFRESH_COOKIE_NAME);
        assertNotNull(rotatedCookie);
        assertNotEquals(loginSession.refreshCookie().getValue(), rotatedCookie.getValue());

        mockMvc.perform(post("/api/auth/refresh")
                        .cookie(new Cookie(REFRESH_COOKIE_NAME, loginSession.refreshCookie().getValue())))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.message").value("Invalid or expired refresh token"));

        mockMvc.perform(post("/api/auth/refresh")
                        .cookie(new Cookie(REFRESH_COOKIE_NAME, rotatedCookie.getValue())))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.accessToken").isString());
    }

    @Test
    void logoutShouldClearRefreshCookieAndBlockFurtherRefresh() throws Exception {
        String email = "session.logout@example.com";
        String password = "AdminPass123!";
        insertAdmin(email, password);

        SessionResponse loginSession = loginAndExtractSession(email, password);

        MvcResult logoutResult = mockMvc.perform(post("/api/auth/logout")
                        .cookie(new Cookie(REFRESH_COOKIE_NAME, loginSession.refreshCookie().getValue())))
                .andExpect(status().isNoContent())
                .andReturn();

        Cookie clearedCookie = logoutResult.getResponse().getCookie(REFRESH_COOKIE_NAME);
        assertNotNull(clearedCookie);
        assertEquals("megna-realestate.com", clearedCookie.getDomain());
        assertEquals(0, clearedCookie.getMaxAge());

        mockMvc.perform(post("/api/auth/refresh")
                        .cookie(new Cookie(REFRESH_COOKIE_NAME, loginSession.refreshCookie().getValue())))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.message").value("Invalid or expired refresh token"));
    }

    @Test
    void changePasswordShouldRevokeRefreshSessions() throws Exception {
        String email = "session.change@example.com";
        String password = "AdminPass123!";
        String nextPassword = "AdminPass456!";
        insertAdmin(email, password);

        SessionResponse loginSession = loginAndExtractSession(email, password);

        mockMvc.perform(post("/api/auth/password/change")
                        .header("Authorization", "Bearer " + loginSession.accessToken())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(new ChangePasswordBody(password, nextPassword))))
                .andExpect(status().isNoContent());

        mockMvc.perform(post("/api/auth/refresh")
                        .cookie(new Cookie(REFRESH_COOKIE_NAME, loginSession.refreshCookie().getValue())))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.message").value("Invalid or expired refresh token"));
    }

    @Test
    void resetPasswordShouldRevokeRefreshSessions() throws Exception {
        String email = "session.reset@example.com";
        String password = "SellerPass123!";
        String nextPassword = "SellerPass456!";
        String resetToken = "seller-refresh-reset-token";
        Long sellerId = insertSeller(email, password);

        SessionResponse loginSession = loginAndExtractSession(email, password);
        insertPasswordResetToken("SELLER", sellerId, resetToken, LocalDateTime.now().plusMinutes(15));

        mockMvc.perform(post("/api/auth/password/reset")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(new ResetBody(resetToken, nextPassword))))
                .andExpect(status().isNoContent());

        mockMvc.perform(post("/api/auth/refresh")
                        .cookie(new Cookie(REFRESH_COOKIE_NAME, loginSession.refreshCookie().getValue())))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.message").value("Invalid or expired refresh token"));
    }

    private SessionResponse loginAndExtractSession(String email, String password) throws Exception {
        MvcResult loginResult = mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(new LoginBody(email, password))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.accessToken").isString())
                .andExpect(jsonPath("$.user").exists())
                .andExpect(jsonPath("$.user.email").value(email))
                .andReturn();

        JsonNode body = objectMapper.readTree(loginResult.getResponse().getContentAsString());
        Cookie refreshCookie = loginResult.getResponse().getCookie(REFRESH_COOKIE_NAME);
        return new SessionResponse(body.get("accessToken").asText(), refreshCookie);
    }

    private void insertAdmin(String email, String password) {
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

    private Long insertSeller(String email, String password) {
        LocalDateTime now = LocalDateTime.now();
        jdbcTemplate.update("""
                        INSERT INTO sellers
                        (first_name, last_name, company_name, email, phone, password_hash, status, created_at, updated_at)
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                        """,
                "Test",
                "Seller",
                "Integration LLC",
                email,
                "+1-555-333-4444",
                passwordEncoder.encode(password),
                "ACTIVE",
                Timestamp.valueOf(now),
                Timestamp.valueOf(now)
        );

        return jdbcTemplate.queryForObject("SELECT id FROM sellers WHERE email = ?", Long.class, email);
    }

    private void insertPasswordResetToken(String principalType, Long principalId, String rawToken, LocalDateTime expiresAt) {
        LocalDateTime now = LocalDateTime.now();
        jdbcTemplate.update("""
                        INSERT INTO password_reset_tokens
                        (principal_type, principal_id, token_hash, expires_at, used_at, created_at)
                        VALUES (?, ?, ?, ?, ?, ?)
                        """,
                principalType,
                principalId,
                hashToken(rawToken),
                Timestamp.valueOf(expiresAt),
                null,
                Timestamp.valueOf(now)
        );
    }

    private String hashToken(String token) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hashed = digest.digest(token.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(hashed);
        } catch (NoSuchAlgorithmException ex) {
            throw new IllegalStateException("SHA-256 is not available", ex);
        }
    }

    private record LoginBody(String email, String password) {}
    private record ChangePasswordBody(String currentPassword, String newPassword) {}
    private record ResetBody(String token, String newPassword) {}
    private record SessionResponse(String accessToken, Cookie refreshCookie) {}
}

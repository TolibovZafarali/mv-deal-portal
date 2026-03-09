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
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import jakarta.servlet.http.Cookie;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.sql.Timestamp;
import java.time.LocalDateTime;
import java.util.HexFormat;
import java.util.List;

import static org.hamcrest.Matchers.containsString;
import static org.hamcrest.Matchers.notNullValue;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.MOCK)
@AutoConfigureMockMvc
class AuthRefreshTokenIntegrationTest {

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
    void loginShouldSetRefreshCookieAndRefreshShouldRotateIt() throws Exception {
        String email = "admin.refresh.rotate@example.com";
        String password = "AdminPass123!";
        insertAdmin(email, password);

        LoginResult login = loginAndExtractTokens(email, password);

        MvcResult refreshResult = mockMvc.perform(post("/api/auth/refresh")
                        .cookie(refreshCookie(login.refreshToken())))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.accessToken").isString())
                .andExpect(header().string("Set-Cookie", containsString(REFRESH_COOKIE_NAME + "=")))
                .andReturn();

        String rotatedToken = extractCookieValue(refreshResult, REFRESH_COOKIE_NAME);
        org.junit.jupiter.api.Assertions.assertNotNull(rotatedToken);
        org.junit.jupiter.api.Assertions.assertNotEquals(login.refreshToken(), rotatedToken);

        mockMvc.perform(post("/api/auth/refresh")
                        .cookie(refreshCookie(login.refreshToken())))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.message").value("Invalid or expired refresh token"));

        mockMvc.perform(post("/api/auth/refresh")
                        .cookie(refreshCookie(rotatedToken)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.accessToken").isString());
    }

    @Test
    void refreshShouldFailWhenCookieMissing() throws Exception {
        mockMvc.perform(post("/api/auth/refresh"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.message").value("Invalid or expired refresh token"));
    }

    @Test
    void logoutShouldRevokeRefreshTokenAndClearCookie() throws Exception {
        String email = "admin.refresh.logout@example.com";
        String password = "AdminPass123!";
        insertAdmin(email, password);

        LoginResult login = loginAndExtractTokens(email, password);

        mockMvc.perform(post("/api/auth/logout")
                        .cookie(refreshCookie(login.refreshToken())))
                .andExpect(status().isNoContent())
                .andExpect(header().string("Set-Cookie", containsString(REFRESH_COOKIE_NAME + "=")))
                .andExpect(header().string("Set-Cookie", containsString("Max-Age=0")));

        mockMvc.perform(post("/api/auth/refresh")
                        .cookie(refreshCookie(login.refreshToken())))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void secondLoginShouldInvalidateFirstSessionRefreshToken() throws Exception {
        String email = "admin.refresh.relogin@example.com";
        String password = "AdminPass123!";
        insertAdmin(email, password);

        LoginResult firstLogin = loginAndExtractTokens(email, password);
        LoginResult secondLogin = loginAndExtractTokens(email, password);

        mockMvc.perform(post("/api/auth/refresh")
                        .cookie(refreshCookie(firstLogin.refreshToken())))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.message").value("Invalid or expired refresh token"));

        mockMvc.perform(post("/api/auth/refresh")
                        .cookie(refreshCookie(secondLogin.refreshToken())))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.accessToken").isString());
    }

    @Test
    void secondLoginShouldInvalidateFirstSessionAccessTokenImmediately() throws Exception {
        String email = "admin.refresh.relogin-access@example.com";
        String password = "AdminPass123!";
        insertAdmin(email, password);

        LoginResult firstLogin = loginAndExtractTokens(email, password);
        LoginResult secondLogin = loginAndExtractTokens(email, password);

        assertThrows(BadCredentialsException.class, () ->
                mockMvc.perform(get("/api/auth/me")
                        .header("Authorization", "Bearer " + firstLogin.accessToken()))
        );

        mockMvc.perform(get("/api/auth/me")
                        .header("Authorization", "Bearer " + secondLogin.accessToken()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.email").value(email));
    }

    @Test
    void passwordChangeShouldRevokeRefreshToken() throws Exception {
        String email = "admin.refresh.password-change@example.com";
        String currentPassword = "AdminPass123!";
        String nextPassword = "AdminPass456!";
        insertAdmin(email, currentPassword);

        LoginResult login = loginAndExtractTokens(email, currentPassword);

        mockMvc.perform(post("/api/auth/password/change")
                        .header("Authorization", "Bearer " + login.accessToken())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(new ChangePasswordBody(currentPassword, nextPassword))))
                .andExpect(status().isNoContent());

        mockMvc.perform(post("/api/auth/refresh")
                        .cookie(refreshCookie(login.refreshToken())))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.message").value("Invalid or expired refresh token"));
    }

    @Test
    void passwordResetShouldRevokeRefreshToken() throws Exception {
        String email = "seller.refresh.password-reset@example.com";
        String oldPassword = "SellerPass123!";
        String newPassword = "SellerPass456!";
        String resetToken = "seller-refresh-reset-token";

        Long sellerId = insertSeller(email, oldPassword);
        insertPasswordResetToken("SELLER", sellerId, resetToken, LocalDateTime.now().plusMinutes(20), null);

        LoginResult login = loginAndExtractTokens(email, oldPassword);

        mockMvc.perform(post("/api/auth/password/reset")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(new ResetPasswordBody(resetToken, newPassword))))
                .andExpect(status().isNoContent());

        mockMvc.perform(post("/api/auth/refresh")
                        .cookie(refreshCookie(login.refreshToken())))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.message").value("Invalid or expired refresh token"));

        mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(new LoginBody(email, newPassword))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.accessToken", notNullValue()));
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

    private void insertPasswordResetToken(
            String principalType,
            Long principalId,
            String rawToken,
            LocalDateTime expiresAt,
            LocalDateTime usedAt
    ) {
        jdbcTemplate.update("""
                        INSERT INTO password_reset_tokens
                        (principal_type, principal_id, token_hash, expires_at, used_at, created_at)
                        VALUES (?, ?, ?, ?, ?, ?)
                        """,
                principalType,
                principalId,
                hashToken(rawToken),
                Timestamp.valueOf(expiresAt),
                usedAt == null ? null : Timestamp.valueOf(usedAt),
                Timestamp.valueOf(LocalDateTime.now())
        );
    }

    private LoginResult loginAndExtractTokens(String email, String password) throws Exception {
        MvcResult loginResult = mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(new LoginBody(email, password))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.accessToken").isString())
                .andExpect(header().string("Set-Cookie", containsString(REFRESH_COOKIE_NAME + "=")))
                .andReturn();

        JsonNode body = objectMapper.readTree(loginResult.getResponse().getContentAsString());
        String accessToken = body.get("accessToken").asText();
        String refreshToken = extractCookieValue(loginResult, REFRESH_COOKIE_NAME);

        return new LoginResult(accessToken, refreshToken);
    }

    private String extractCookieValue(MvcResult result, String cookieName) {
        List<String> cookieHeaders = result.getResponse().getHeaders("Set-Cookie");
        for (String headerValue : cookieHeaders) {
            String prefix = cookieName + "=";
            if (!headerValue.startsWith(prefix)) {
                continue;
            }

            int end = headerValue.indexOf(';');
            if (end < 0) {
                return headerValue.substring(prefix.length());
            }
            return headerValue.substring(prefix.length(), end);
        }

        return null;
    }

    private Cookie refreshCookie(String refreshToken) {
        return new Cookie(REFRESH_COOKIE_NAME, refreshToken);
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
    private record ResetPasswordBody(String token, String newPassword) {}
    private record LoginResult(String accessToken, String refreshToken) {}
}

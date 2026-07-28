package com.megna.backend;

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

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.sql.Timestamp;
import java.time.LocalDateTime;
import java.util.HexFormat;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.MOCK)
@AutoConfigureMockMvc
class AuthPasswordResetIntegrationTest {

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
    void forgotPasswordShouldCreatePasscodeForInvestor() throws Exception {
        Long investorId = insertInvestor("investor.reset@example.com", "InvestorPass123!", "APPROVED");

        mockMvc.perform(post("/api/auth/password/forgot")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(new ForgotBody("investor.reset@example.com"))))
                .andExpect(status().isNoContent());

        Integer tokenCount = jdbcTemplate.queryForObject(
                """
                        SELECT COUNT(*)
                        FROM password_reset_tokens
                        WHERE principal_type = 'INVESTOR'
                          AND principal_id = ?
                          AND used_at IS NULL
                          AND verification_attempts = 0
                          AND LENGTH(token_hash) = 60
                        """,
                Integer.class,
                investorId
        );

        org.junit.jupiter.api.Assertions.assertEquals(1, tokenCount);
    }

    @Test
    void forgotPasswordShouldCreatePasscodeForSeller() throws Exception {
        Long sellerId = insertSeller("seller.reset@example.com", "SellerPass123!");

        mockMvc.perform(post("/api/auth/password/forgot")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(new ForgotBody("seller.reset@example.com"))))
                .andExpect(status().isNoContent());

        Integer tokenCount = jdbcTemplate.queryForObject(
                """
                        SELECT COUNT(*)
                        FROM password_reset_tokens
                        WHERE principal_type = 'SELLER'
                          AND principal_id = ?
                          AND used_at IS NULL
                          AND verification_attempts = 0
                          AND LENGTH(token_hash) = 60
                        """,
                Integer.class,
                sellerId
        );

        org.junit.jupiter.api.Assertions.assertEquals(1, tokenCount);
    }

    @Test
    void forgotPasswordShouldReturnNoContentForUnknownEmail() throws Exception {
        mockMvc.perform(post("/api/auth/password/forgot")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(new ForgotBody("unknown@example.com"))))
                .andExpect(status().isNoContent());

        Integer tokenCount = jdbcTemplate.queryForObject("SELECT COUNT(*) FROM password_reset_tokens", Integer.class);
        org.junit.jupiter.api.Assertions.assertEquals(0, tokenCount);
    }

    @Test
    void forgotPasswordShouldCreatePasscodeForAdminEmail() throws Exception {
        Long adminId = insertAdmin("admin.reset@example.com", "AdminPass123!");

        mockMvc.perform(post("/api/auth/password/forgot")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(new ForgotBody("admin.reset@example.com"))))
                .andExpect(status().isNoContent());

        Integer tokenCount = jdbcTemplate.queryForObject(
                """
                        SELECT COUNT(*)
                        FROM password_reset_tokens
                        WHERE principal_type = 'ADMIN'
                          AND principal_id = ?
                          AND used_at IS NULL
                          AND verification_attempts = 0
                        """,
                Integer.class,
                adminId
        );
        org.junit.jupiter.api.Assertions.assertEquals(1, tokenCount);
    }

    @Test
    void investorPasscodeShouldResetPasswordAndRejectReuse() throws Exception {
        String email = "investor.flow@example.com";
        String currentPassword = "InvestorPass123!";
        String newPassword = "InvestorPass456!";
        String passcode = "271828";
        Long investorId = insertInvestor(email, currentPassword, "APPROVED");
        insertPasscode("INVESTOR", investorId, passcode, LocalDateTime.now().plusMinutes(10));

        mockMvc.perform(post("/api/auth/password/reset/passcode")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(
                                new PasscodeResetBody(email, passcode, newPassword)
                        )))
                .andExpect(status().isNoContent());

        mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(new LoginBody(email, currentPassword))))
                .andExpect(status().isUnauthorized());

        mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(new LoginBody(email, newPassword))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.user.role").value("INVESTOR"));

        mockMvc.perform(post("/api/auth/password/reset/passcode")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(
                                new PasscodeResetBody(email, passcode, "InvestorPass789!")
                        )))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("Invalid or expired passcode"));
    }

    @Test
    void sellerPasscodeShouldResetPassword() throws Exception {
        String email = "seller.passcode@example.com";
        String currentPassword = "SellerPass123!";
        String newPassword = "SellerPass456!";
        String passcode = "161803";
        Long sellerId = insertSeller(email, currentPassword);
        insertPasscode("SELLER", sellerId, passcode, LocalDateTime.now().plusMinutes(10));

        mockMvc.perform(post("/api/auth/password/reset/passcode")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(
                                new PasscodeResetBody(email, passcode, newPassword)
                        )))
                .andExpect(status().isNoContent());

        mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(new LoginBody(email, currentPassword))))
                .andExpect(status().isUnauthorized());

        mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(new LoginBody(email, newPassword))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.user.role").value("SELLER"));
    }

    @Test
    void adminPasscodeShouldResetPasswordRevokeSessionsAndRejectReuse() throws Exception {
        String email = "admin.flow@example.com";
        String currentPassword = "AdminPass123!";
        String newPassword = "AdminPass456!";
        String passcode = "314159";
        Long adminId = insertAdmin(email, currentPassword);
        insertPasscode("ADMIN", adminId, passcode, LocalDateTime.now().plusMinutes(10));

        mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(new LoginBody(email, currentPassword))))
                .andExpect(status().isOk());

        mockMvc.perform(post("/api/auth/password/reset/passcode")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(
                                new PasscodeResetBody(email, passcode, newPassword)
                        )))
                .andExpect(status().isNoContent());

        mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(new LoginBody(email, currentPassword))))
                .andExpect(status().isUnauthorized());

        Integer activeSessionsAfterReset = jdbcTemplate.queryForObject(
                """
                        SELECT COUNT(*)
                        FROM refresh_tokens
                        WHERE principal_type = 'ADMIN'
                          AND principal_id = ?
                          AND revoked_at IS NULL
                        """,
                Integer.class,
                adminId
        );
        org.junit.jupiter.api.Assertions.assertEquals(0, activeSessionsAfterReset);

        mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(new LoginBody(email, newPassword))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.user.role").value("ADMIN"));

        Integer activeNewSessions = jdbcTemplate.queryForObject(
                """
                        SELECT COUNT(*)
                        FROM refresh_tokens
                        WHERE principal_type = 'ADMIN'
                          AND principal_id = ?
                          AND revoked_at IS NULL
                        """,
                Integer.class,
                adminId
        );
        org.junit.jupiter.api.Assertions.assertEquals(1, activeNewSessions);

        mockMvc.perform(post("/api/auth/password/reset/passcode")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(
                                new PasscodeResetBody(email, passcode, "AdminPass789!")
                        )))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("Invalid or expired passcode"));
    }

    @Test
    void wrongPasscodesShouldIncrementAttemptsAndLockTheCodeForInvestors() throws Exception {
        String email = "investor.attempts@example.com";
        Long investorId = insertInvestor(email, "InvestorPass123!", "APPROVED");
        insertPasscode("INVESTOR", investorId, "654321", LocalDateTime.now().plusMinutes(10));

        for (int attempt = 1; attempt <= 5; attempt++) {
            mockMvc.perform(post("/api/auth/password/reset/passcode")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(
                                    new PasscodeResetBody(email, "000000", "InvestorPass456!")
                            )))
                    .andExpect(status().isBadRequest())
                    .andExpect(jsonPath("$.message").value("Invalid or expired passcode"));
        }

        Integer attempts = jdbcTemplate.queryForObject(
                """
                        SELECT verification_attempts
                        FROM password_reset_tokens
                        WHERE principal_type = 'INVESTOR' AND principal_id = ?
                        """,
                Integer.class,
                investorId
        );
        Timestamp usedAt = jdbcTemplate.queryForObject(
                """
                        SELECT used_at
                        FROM password_reset_tokens
                        WHERE principal_type = 'INVESTOR' AND principal_id = ?
                        """,
                Timestamp.class,
                investorId
        );
        org.junit.jupiter.api.Assertions.assertEquals(5, attempts);
        org.junit.jupiter.api.Assertions.assertNotNull(usedAt);

        mockMvc.perform(post("/api/auth/password/reset/passcode")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(
                                new PasscodeResetBody(email, "654321", "InvestorPass456!")
                        )))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("Invalid or expired passcode"));
    }

    @Test
    void expiredPasscodeShouldBeConsumedWithoutChangingPassword() throws Exception {
        String email = "seller.expired.passcode@example.com";
        String currentPassword = "SellerPass123!";
        String passcode = "112358";
        Long sellerId = insertSeller(email, currentPassword);
        insertPasscode("SELLER", sellerId, passcode, LocalDateTime.now().minusMinutes(1));

        mockMvc.perform(post("/api/auth/password/reset/passcode")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(
                                new PasscodeResetBody(email, passcode, "SellerPass456!")
                        )))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("Invalid or expired passcode"));

        Timestamp usedAt = jdbcTemplate.queryForObject(
                """
                        SELECT used_at
                        FROM password_reset_tokens
                        WHERE principal_type = 'SELLER' AND principal_id = ?
                        """,
                Timestamp.class,
                sellerId
        );
        org.junit.jupiter.api.Assertions.assertNotNull(usedAt);

        mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(new LoginBody(email, currentPassword))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.user.role").value("SELLER"));
    }

    @Test
    void resetPasswordShouldUpdatePasswordAndRejectTokenReuse() throws Exception {
        String email = "seller.flow@example.com";
        String currentPassword = "SellerPass123!";
        String newPassword = "SellerPass456!";
        String rawToken = "seller-valid-reset-token";

        Long sellerId = insertSeller(email, currentPassword);
        insertPasswordResetToken("SELLER", sellerId, rawToken, LocalDateTime.now().plusMinutes(20), null);

        mockMvc.perform(post("/api/auth/password/reset")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(new ResetBody(rawToken, newPassword))))
                .andExpect(status().isNoContent());

        mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(new LoginBody(email, currentPassword))))
                .andExpect(status().isUnauthorized());

        mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(new LoginBody(email, newPassword))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.accessToken").isString());

        mockMvc.perform(post("/api/auth/password/reset")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(new ResetBody(rawToken, "SellerPass789!"))))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("Invalid or expired reset token"));
    }

    @Test
    void resetPasswordShouldRejectExpiredToken() throws Exception {
        String email = "investor.expired@example.com";
        String currentPassword = "InvestorPass123!";
        String rawToken = "investor-expired-reset-token";

        Long investorId = insertInvestor(email, currentPassword, "APPROVED");
        insertPasswordResetToken("INVESTOR", investorId, rawToken, LocalDateTime.now().minusMinutes(1), null);

        mockMvc.perform(post("/api/auth/password/reset")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(new ResetBody(rawToken, "InvestorPass456!"))))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("Invalid or expired reset token"));

        Timestamp usedAt = jdbcTemplate.queryForObject(
                """
                        SELECT used_at
                        FROM password_reset_tokens
                        WHERE principal_type = 'INVESTOR' AND principal_id = ?
                        """,
                Timestamp.class,
                investorId
        );
        org.junit.jupiter.api.Assertions.assertNotNull(usedAt);

        mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(new LoginBody(email, currentPassword))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.accessToken").isString());
    }

    @Test
    void resetPasswordShouldRejectSameAsCurrentPassword() throws Exception {
        String email = "investor.samepass@example.com";
        String password = "InvestorPass123!";
        String rawToken = "investor-same-reset-token";

        Long investorId = insertInvestor(email, password, "APPROVED");
        insertPasswordResetToken("INVESTOR", investorId, rawToken, LocalDateTime.now().plusMinutes(20), null);

        mockMvc.perform(post("/api/auth/password/reset")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(new ResetBody(rawToken, password))))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("New password must be different"));
    }

    @Test
    void resetPasswordShouldRejectInvalidToken() throws Exception {
        mockMvc.perform(post("/api/auth/password/reset")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(new ResetBody("not-a-real-token", "NewPass123!"))))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("Invalid or expired reset token"));
    }

    private Long insertInvestor(String email, String password, String status) {
        LocalDateTime now = LocalDateTime.now();
        jdbcTemplate.update("""
                        INSERT INTO investors
                        (first_name, last_name, company_name, email, notification_email, phone, password_hash, status, rejection_reason, approved_at, created_at, updated_at)
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                        """,
                "Test",
                "Investor",
                "Integration LLC",
                email,
                email,
                "+1-555-111-2222",
                passwordEncoder.encode(password),
                status,
                null,
                "APPROVED".equals(status) ? Timestamp.valueOf(now) : null,
                Timestamp.valueOf(now),
                Timestamp.valueOf(now)
        );

        return jdbcTemplate.queryForObject("SELECT id FROM investors WHERE email = ?", Long.class, email);
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

    private Long insertAdmin(String email, String password) {
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

        return jdbcTemplate.queryForObject("SELECT id FROM admins WHERE email = ?", Long.class, email);
    }

    private void insertPasscode(
            String principalType,
            Long principalId,
            String passcode,
            LocalDateTime expiresAt
    ) {
        jdbcTemplate.update("""
                        INSERT INTO password_reset_tokens
                        (principal_type, principal_id, token_hash, expires_at, used_at,
                         verification_attempts, created_at)
                        VALUES (?, ?, ?, ?, ?, ?, ?)
                        """,
                principalType,
                principalId,
                passwordEncoder.encode(passcode),
                Timestamp.valueOf(expiresAt),
                null,
                0,
                Timestamp.valueOf(LocalDateTime.now())
        );
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
                        (principal_type, principal_id, token_hash, expires_at, used_at,
                         verification_attempts, created_at)
                        VALUES (?, ?, ?, ?, ?, ?, ?)
                        """,
                principalType,
                principalId,
                hashToken(rawToken),
                Timestamp.valueOf(expiresAt),
                usedAt == null ? null : Timestamp.valueOf(usedAt),
                0,
                Timestamp.valueOf(LocalDateTime.now())
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

    private record ForgotBody(String email) {}
    private record ResetBody(String token, String newPassword) {}
    private record PasscodeResetBody(String email, String passcode, String newPassword) {}
    private record LoginBody(String email, String password) {}
}

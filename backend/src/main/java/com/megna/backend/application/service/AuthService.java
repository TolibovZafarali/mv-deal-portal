package com.megna.backend.application.service;

import com.megna.backend.application.service.email.TransactionalEmailRequest;
import com.megna.backend.application.service.email.TransactionalEmailService;
import com.megna.backend.domain.entity.Admin;
import com.megna.backend.domain.entity.Investor;
import com.megna.backend.domain.entity.PasswordResetToken;
import com.megna.backend.domain.entity.RefreshToken;
import com.megna.backend.domain.entity.Seller;
import com.megna.backend.domain.enums.InvestorStatus;
import com.megna.backend.domain.enums.SellerStatus;
import com.megna.backend.domain.repository.AdminRepository;
import com.megna.backend.domain.repository.InvestorRepository;
import com.megna.backend.domain.repository.PasswordResetTokenRepository;
import com.megna.backend.domain.repository.RefreshTokenRepository;
import com.megna.backend.domain.repository.SellerRepository;
import com.megna.backend.infrastructure.config.AuthProperties;
import com.megna.backend.infrastructure.security.SecurityUtils;
import com.megna.backend.infrastructure.security.jwt.JwtService;
import com.megna.backend.interfaces.rest.dto.auth.ChangePasswordRequestDto;
import com.megna.backend.interfaces.rest.dto.auth.ForgotPasswordRequestDto;
import com.megna.backend.interfaces.rest.dto.auth.LoginRequestDto;
import com.megna.backend.interfaces.rest.dto.auth.LoginResponseDto;
import com.megna.backend.interfaces.rest.dto.auth.RegisterRequestDto;
import com.megna.backend.interfaces.rest.dto.auth.RegisterResponseDto;
import com.megna.backend.interfaces.rest.dto.auth.ResetPasswordRequestDto;
import com.megna.backend.interfaces.rest.dto.auth.SellerRegisterResponseDto;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.time.LocalDateTime;
import java.util.Base64;
import java.util.HexFormat;
import java.util.LinkedHashMap;
import java.util.Locale;
import java.util.Map;
import java.util.function.Consumer;

@Service
@RequiredArgsConstructor
@Slf4j
public class AuthService {

    private static final String PRINCIPAL_ADMIN = "ADMIN";
    private static final String PRINCIPAL_INVESTOR = "INVESTOR";
    private static final String PRINCIPAL_SELLER = "SELLER";
    private static final String INVALID_RESET_TOKEN_MESSAGE = "Invalid or expired reset token";
    private static final String INVALID_REFRESH_TOKEN_MESSAGE = "Invalid or expired refresh token";
    private static final String RESET_PASSWORD_TEMPLATE_ALIAS = "reset-password-cid-v1";
    private static final String INVESTOR_SIGNUP_UNDER_REVIEW_TEMPLATE_ALIAS = "investor-signup-under-review-cid-v1";
    private static final String PUBLIC_LOGO_URL = "https://raw.githubusercontent.com/TolibovZafarali/mv-deal-portal/dev/frontend/public/white-logo.png";
    private static final int OPAQUE_TOKEN_BYTE_LENGTH = 32;
    private static final SecureRandom SECURE_RANDOM = new SecureRandom();

    private final InvestorRepository investorRepository;
    private final SellerRepository sellerRepository;
    private final AdminRepository adminRepository;
    private final PasswordResetTokenRepository passwordResetTokenRepository;
    private final RefreshTokenRepository refreshTokenRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;
    private final TransactionalEmailService transactionalEmailService;
    private final AuthProperties authProperties;

    @Transactional
    public LoginSessionResult login(LoginRequestDto dto) {
        String email = normalizeEmail(dto.email());

        var adminOpt = adminRepository.findByEmail(email);
        if (adminOpt.isPresent()) {
            Admin admin = adminOpt.get();
            ensurePasswordMatches(dto.password(), admin.getPasswordHash());

            RefreshTokenIssue session = issueRefreshToken(PRINCIPAL_ADMIN, admin.getId());
            LoginResponseDto loginResponse = buildLoginResponse(jwtService.generateAccessToken(admin, session.sessionId()));
            return new LoginSessionResult(loginResponse, session.rawToken());
        }

        var investorOpt = investorRepository.findByEmail(email);
        if (investorOpt.isPresent()) {
            Investor investor = investorOpt.get();
            ensurePasswordMatches(dto.password(), investor.getPasswordHash());

            RefreshTokenIssue session = issueRefreshToken(PRINCIPAL_INVESTOR, investor.getId());
            LoginResponseDto loginResponse = buildLoginResponse(jwtService.generateAccessToken(investor, session.sessionId()));
            return new LoginSessionResult(loginResponse, session.rawToken());
        }

        Seller seller = sellerRepository.findByEmail(email)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid credentials"));

        ensurePasswordMatches(dto.password(), seller.getPasswordHash());

        RefreshTokenIssue session = issueRefreshToken(PRINCIPAL_SELLER, seller.getId());
        LoginResponseDto loginResponse = buildLoginResponse(jwtService.generateAccessToken(seller, session.sessionId()));
        return new LoginSessionResult(loginResponse, session.rawToken());
    }

    @Transactional
    public LoginSessionResult refresh(String rawRefreshToken) {
        String token = normalizeOpaqueToken(rawRefreshToken);
        if (token.isBlank()) {
            throw invalidRefreshToken();
        }

        String tokenHash = hashToken(token);
        RefreshToken refreshToken = refreshTokenRepository.findByTokenHashAndRevokedAtIsNull(tokenHash)
                .orElseThrow(this::invalidRefreshToken);

        LocalDateTime now = LocalDateTime.now();
        if (refreshToken.getExpiresAt() == null || refreshToken.getExpiresAt().isBefore(now)) {
            refreshToken.setRevokedAt(now);
            refreshToken.setLastUsedAt(now);
            refreshTokenRepository.save(refreshToken);
            throw invalidRefreshToken();
        }

        Long principalId = refreshToken.getPrincipalId();
        String principalType = normalizePrincipalType(refreshToken.getPrincipalType());
        LoginResponseDto loginResponse = resolveAccessTokenForPrincipal(principalType, principalId, refreshToken.getId());

        if (loginResponse == null) {
            refreshToken.setRevokedAt(now);
            refreshToken.setLastUsedAt(now);
            refreshTokenRepository.save(refreshToken);
            throw invalidRefreshToken();
        }

        String nextRawToken = generateOpaqueToken();
        refreshToken.setTokenHash(hashToken(nextRawToken));
        refreshToken.setExpiresAt(now.plusMinutes(resolveRefreshTokenTtlMinutes()));
        refreshToken.setLastUsedAt(now);
        refreshTokenRepository.save(refreshToken);

        return new LoginSessionResult(loginResponse, nextRawToken);
    }

    @Transactional
    public void logout(String rawRefreshToken) {
        String token = normalizeOpaqueToken(rawRefreshToken);
        if (token.isBlank()) {
            return;
        }

        refreshTokenRepository.revokeByTokenHash(hashToken(token), LocalDateTime.now());
    }

    @Transactional
    public void changePassword(ChangePasswordRequestDto dto) {
        var principal = SecurityUtils.requirePrincipal();
        String role = principal.role() == null ? "" : principal.role().trim().toUpperCase(Locale.US);

        if (principal.userId() <= 0 || role.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Not authenticated");
        }

        String currentPassword = dto.currentPassword().trim();
        String newPassword = dto.newPassword().trim();

        if (currentPassword.equals(newPassword)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "New password must be different");
        }

        LocalDateTime now = LocalDateTime.now();

        if (PRINCIPAL_ADMIN.equals(role)) {
            var admin = adminRepository.findById(principal.userId())
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Not authenticated"));
            updatePassword(admin.getPasswordHash(), currentPassword, newPassword, admin::setPasswordHash);
            adminRepository.save(admin);
            revokeActiveRefreshTokens(PRINCIPAL_ADMIN, admin.getId(), now);
            return;
        }

        if (PRINCIPAL_INVESTOR.equals(role)) {
            var investor = investorRepository.findById(principal.userId())
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Not authenticated"));
            updatePassword(investor.getPasswordHash(), currentPassword, newPassword, investor::setPasswordHash);
            investorRepository.save(investor);
            revokeActiveRefreshTokens(PRINCIPAL_INVESTOR, investor.getId(), now);
            return;
        }

        if (PRINCIPAL_SELLER.equals(role)) {
            var seller = sellerRepository.findById(principal.userId())
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Not authenticated"));
            updatePassword(seller.getPasswordHash(), currentPassword, newPassword, seller::setPasswordHash);
            sellerRepository.save(seller);
            revokeActiveRefreshTokens(PRINCIPAL_SELLER, seller.getId(), now);
            return;
        }

        throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Not authenticated");
    }

    @Transactional
    public void requestPasswordReset(ForgotPasswordRequestDto dto) {
        String email = normalizeEmail(dto.email());
        if (email.isBlank()) {
            return;
        }

        PrincipalRef principal = resolvePasswordResetPrincipal(email);
        if (principal == null) {
            return;
        }

        passwordResetTokenRepository.deleteByPrincipalTypeAndPrincipalIdAndUsedAtIsNull(
                principal.type(),
                principal.id()
        );

        String rawToken = generateOpaqueToken();
        PasswordResetToken resetToken = new PasswordResetToken();
        resetToken.setPrincipalType(principal.type());
        resetToken.setPrincipalId(principal.id());
        resetToken.setTokenHash(hashToken(rawToken));
        resetToken.setExpiresAt(LocalDateTime.now().plusMinutes(resolvePasswordResetTtlMinutes()));
        passwordResetTokenRepository.save(resetToken);

        try {
            boolean sent = transactionalEmailService.sendTransactional(
                    TransactionalEmailRequest.template(
                            principal.email(),
                            RESET_PASSWORD_TEMPLATE_ALIAS,
                            buildPasswordResetModel(rawToken)
                    )
            );
            if (!sent) {
                log.warn("Password reset email was not delivered for principalType={} principalId={}",
                        principal.type(), principal.id());
            }
        } catch (RuntimeException ex) {
            // Keep the endpoint response generic and successful even if email delivery fails.
            log.warn("Password reset email send threw runtime exception for principalType={} principalId={} type={}",
                    principal.type(), principal.id(), ex.getClass().getSimpleName());
        }
    }

    @Transactional
    public void resetPassword(ResetPasswordRequestDto dto) {
        String rawToken = dto.token().trim();
        String newPassword = dto.newPassword().trim();

        PasswordResetToken resetToken = passwordResetTokenRepository.findByTokenHashAndUsedAtIsNull(hashToken(rawToken))
                .orElseThrow(this::invalidResetToken);

        LocalDateTime now = LocalDateTime.now();
        if (resetToken.getExpiresAt() == null || resetToken.getExpiresAt().isBefore(now)) {
            resetToken.setUsedAt(now);
            passwordResetTokenRepository.save(resetToken);
            throw invalidResetToken();
        }

        String principalType = normalizePrincipalType(resetToken.getPrincipalType());

        if (PRINCIPAL_INVESTOR.equals(principalType)) {
            Investor investor = investorRepository.findById(resetToken.getPrincipalId())
                    .orElseThrow(this::invalidResetToken);
            ensurePasswordDifferent(newPassword, investor.getPasswordHash());
            investor.setPasswordHash(passwordEncoder.encode(newPassword));
            investorRepository.save(investor);
        } else if (PRINCIPAL_SELLER.equals(principalType)) {
            Seller seller = sellerRepository.findById(resetToken.getPrincipalId())
                    .orElseThrow(this::invalidResetToken);
            ensurePasswordDifferent(newPassword, seller.getPasswordHash());
            seller.setPasswordHash(passwordEncoder.encode(newPassword));
            sellerRepository.save(seller);
        } else {
            resetToken.setUsedAt(now);
            passwordResetTokenRepository.save(resetToken);
            throw invalidResetToken();
        }

        resetToken.setUsedAt(now);
        passwordResetTokenRepository.save(resetToken);
        passwordResetTokenRepository.markActiveTokensUsed(
                principalType,
                resetToken.getPrincipalId(),
                now,
                resetToken.getId()
        );
        revokeActiveRefreshTokens(principalType, resetToken.getPrincipalId(), now);
    }

    public RegisterResponseDto registerInvestor(RegisterRequestDto dto) {
        String email = normalizeEmail(dto.email());
        assertEmailAvailable(email);

        Investor investor = new Investor();
        investor.setFirstName(dto.firstName().trim());
        investor.setLastName(dto.lastName().trim());
        investor.setCompanyName(dto.companyName().trim());
        investor.setEmail(email);
        investor.setNotificationEmail(email);
        investor.setPhone(dto.phone().trim());

        investor.setPasswordHash(passwordEncoder.encode(dto.password().trim()));

        investor.setStatus(InvestorStatus.PENDING);

        Investor saved = investorRepository.save(investor);
        sendInvestorSignupUnderReviewEmail(saved);

        return new RegisterResponseDto(
                saved.getId(),
                saved.getEmail(),
                saved.getStatus().name()
        );
    }

    public SellerRegisterResponseDto registerSeller(RegisterRequestDto dto) {
        String email = normalizeEmail(dto.email());
        assertEmailAvailable(email);

        Seller seller = new Seller();
        seller.setFirstName(dto.firstName().trim());
        seller.setLastName(dto.lastName().trim());
        seller.setCompanyName(dto.companyName().trim());
        seller.setEmail(email);
        seller.setNotificationEmail(email);
        seller.setPhone(dto.phone().trim());
        seller.setPasswordHash(passwordEncoder.encode(dto.password().trim()));
        seller.setStatus(SellerStatus.ACTIVE);

        Seller saved = sellerRepository.save(seller);

        return new SellerRegisterResponseDto(
                saved.getId(),
                saved.getEmail(),
                saved.getStatus().name()
        );
    }

    private void assertEmailAvailable(String email) {
        if (adminRepository.existsByEmail(email)
                || investorRepository.findByEmail(email).isPresent()
                || sellerRepository.existsByEmail(email)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Email already in use");
        }
    }

    private void ensurePasswordMatches(String rawPassword, String passwordHash) {
        if (!passwordEncoder.matches(rawPassword, passwordHash)) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid credentials");
        }
    }

    private void updatePassword(
            String existingPasswordHash,
            String currentPassword,
            String newPassword,
            Consumer<String> setPasswordHash
    ) {
        if (!passwordEncoder.matches(currentPassword, existingPasswordHash)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Current password is incorrect");
        }

        if (passwordEncoder.matches(newPassword, existingPasswordHash)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "New password must be different");
        }

        setPasswordHash.accept(passwordEncoder.encode(newPassword));
    }

    private void ensurePasswordDifferent(String newPassword, String existingPasswordHash) {
        if (passwordEncoder.matches(newPassword, existingPasswordHash)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "New password must be different");
        }
    }

    private LoginResponseDto buildLoginResponse(String token) {
        return new LoginResponseDto(token, "Bearer", jwtService.getAccessTokenTtlSeconds());
    }

    private LoginResponseDto resolveAccessTokenForPrincipal(String principalType, Long principalId, Long sessionId) {
        if (principalId == null || principalId <= 0 || principalType.isBlank()) {
            return null;
        }

        if (PRINCIPAL_ADMIN.equals(principalType)) {
            return adminRepository.findById(principalId)
                    .map(admin -> jwtService.generateAccessToken(admin, sessionId))
                    .map(this::buildLoginResponse)
                    .orElse(null);
        }

        if (PRINCIPAL_INVESTOR.equals(principalType)) {
            return investorRepository.findById(principalId)
                    .map(investor -> jwtService.generateAccessToken(investor, sessionId))
                    .map(this::buildLoginResponse)
                    .orElse(null);
        }

        if (PRINCIPAL_SELLER.equals(principalType)) {
            return sellerRepository.findById(principalId)
                    .map(seller -> jwtService.generateAccessToken(seller, sessionId))
                    .map(this::buildLoginResponse)
                    .orElse(null);
        }

        return null;
    }

    private RefreshTokenIssue issueRefreshToken(String principalType, Long principalId) {
        LocalDateTime now = LocalDateTime.now();
        revokeActiveRefreshTokens(principalType, principalId, now);

        String rawToken = generateOpaqueToken();
        RefreshToken refreshToken = new RefreshToken();
        refreshToken.setPrincipalType(principalType);
        refreshToken.setPrincipalId(principalId);
        refreshToken.setTokenHash(hashToken(rawToken));
        refreshToken.setExpiresAt(now.plusMinutes(resolveRefreshTokenTtlMinutes()));
        refreshTokenRepository.save(refreshToken);

        return new RefreshTokenIssue(rawToken, refreshToken.getId());
    }

    private void revokeActiveRefreshTokens(String principalType, Long principalId, LocalDateTime revokedAt) {
        if (principalType == null || principalType.isBlank() || principalId == null || principalId <= 0) {
            return;
        }
        refreshTokenRepository.revokeActiveByPrincipal(principalType, principalId, revokedAt);
    }

    private String normalizeEmail(String email) {
        if (email == null) return "";
        return email.trim().toLowerCase(Locale.US);
    }

    private String normalizeOpaqueToken(String token) {
        if (token == null) {
            return "";
        }
        return token.trim();
    }

    private String normalizePrincipalType(String principalType) {
        if (principalType == null) {
            return "";
        }
        return principalType.trim().toUpperCase(Locale.US);
    }

    private PrincipalRef resolvePasswordResetPrincipal(String email) {
        var investorOpt = investorRepository.findByEmail(email);
        if (investorOpt.isPresent()) {
            Investor investor = investorOpt.get();
            return new PrincipalRef(PRINCIPAL_INVESTOR, investor.getId(), investor.getEmail());
        }

        var sellerOpt = sellerRepository.findByEmail(email);
        if (sellerOpt.isPresent()) {
            Seller seller = sellerOpt.get();
            return new PrincipalRef(PRINCIPAL_SELLER, seller.getId(), seller.getEmail());
        }

        return null;
    }

    private long resolvePasswordResetTtlMinutes() {
        long ttlMinutes = authProperties.getPasswordResetTokenTtlMinutes();
        return ttlMinutes > 0 ? ttlMinutes : 30;
    }

    private long resolveRefreshTokenTtlMinutes() {
        long ttlMinutes = authProperties.getRefreshTokenTtlMinutes();
        return ttlMinutes > 0 ? ttlMinutes : 20160;
    }

    private Map<String, Object> buildPasswordResetModel(String rawToken) {
        String resetLink = buildPasswordResetLink(rawToken);
        long ttlMinutes = resolvePasswordResetTtlMinutes();
        Map<String, Object> model = new LinkedHashMap<>();
        model.put("logo_url", PUBLIC_LOGO_URL);
        model.put("subject", "Reset your password");
        model.put("title", "Reset your password");
        model.put("message", "We received a request to reset your password.");
        model.put("expiry_note", "For your security, this link expires in " + ttlMinutes + " minutes.");
        model.put("action_text", "Reset Password");
        model.put("action_url", resetLink);
        model.put("footer_text", "If you didn't request this, you can ignore this email.");
        return model;
    }

    private void sendInvestorSignupUnderReviewEmail(Investor investor) {
        if (investor == null || investor.getEmail() == null || investor.getEmail().isBlank()) {
            return;
        }

        try {
            boolean sent = transactionalEmailService.sendTransactional(
                    TransactionalEmailRequest.template(
                            investor.getEmail(),
                            INVESTOR_SIGNUP_UNDER_REVIEW_TEMPLATE_ALIAS,
                            buildInvestorSignupUnderReviewModel(investor)
                    )
            );
            if (!sent) {
                log.warn("Investor signup under review email was not delivered for investorId={}", investor.getId());
            }
        } catch (RuntimeException ex) {
            log.warn("Investor signup under review email send threw runtime exception for investorId={} type={}",
                    investor.getId(), ex.getClass().getSimpleName());
        }
    }

    private Map<String, Object> buildInvestorSignupUnderReviewModel(Investor investor) {
        String firstName = investor == null || investor.getFirstName() == null
                ? ""
                : investor.getFirstName().trim();
        String greetingName = firstName.isBlank() ? "there" : firstName;

        Map<String, Object> model = new LinkedHashMap<>();
        model.put("logo_url", PUBLIC_LOGO_URL);
        model.put("subject", "Welcome to Megna - your account is under review");
        model.put("title", "Welcome to Megna, " + greetingName);
        model.put("message", "Thanks for signing up. Your account is now under review by the Megna Team, and one of our team members will reach out to you shortly.");
        model.put("footer_text", "If you have questions, reply to this email and our team will assist you.");
        return model;
    }

    private String buildPasswordResetLink(String rawToken) {
        String baseUrl = authProperties.getPasswordResetUrlBase() == null
                ? ""
                : authProperties.getPasswordResetUrlBase().trim();
        if (baseUrl.isBlank()) {
            return "";
        }

        String separator = baseUrl.contains("?") ? "&" : "?";
        return baseUrl + separator + "token=" + urlEncode(rawToken);
    }

    private String generateOpaqueToken() {
        byte[] bytes = new byte[OPAQUE_TOKEN_BYTE_LENGTH];
        SECURE_RANDOM.nextBytes(bytes);
        return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
    }

    private String hashToken(String rawToken) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hash = digest.digest(rawToken.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(hash);
        } catch (NoSuchAlgorithmException ex) {
            throw new IllegalStateException("SHA-256 is not available", ex);
        }
    }

    private String urlEncode(String value) {
        return URLEncoder.encode(value, StandardCharsets.UTF_8);
    }

    private ResponseStatusException invalidResetToken() {
        return new ResponseStatusException(HttpStatus.BAD_REQUEST, INVALID_RESET_TOKEN_MESSAGE);
    }

    private ResponseStatusException invalidRefreshToken() {
        return new ResponseStatusException(HttpStatus.UNAUTHORIZED, INVALID_REFRESH_TOKEN_MESSAGE);
    }

    private record PrincipalRef(String type, Long id, String email) {}
    private record RefreshTokenIssue(String rawToken, Long sessionId) {}

    public record LoginSessionResult(LoginResponseDto loginResponse, String refreshToken) {}
}

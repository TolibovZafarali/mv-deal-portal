package com.megna.backend.application.service;

import com.megna.backend.application.service.email.TransactionalEmailRequest;
import com.megna.backend.application.service.email.TransactionalEmailService;
import com.megna.backend.domain.entity.PasswordResetToken;
import com.megna.backend.infrastructure.config.AuthProperties;
import com.megna.backend.infrastructure.security.SecurityUtils;
import com.megna.backend.interfaces.rest.dto.auth.ChangePasswordRequestDto;
import com.megna.backend.interfaces.rest.dto.auth.ForgotPasswordRequestDto;
import com.megna.backend.interfaces.rest.dto.auth.LoginRequestDto;
import com.megna.backend.interfaces.rest.dto.auth.LoginResponseDto;
import com.megna.backend.interfaces.rest.dto.auth.RegisterRequestDto;
import com.megna.backend.interfaces.rest.dto.auth.RegisterResponseDto;
import com.megna.backend.interfaces.rest.dto.auth.ResetPasswordRequestDto;
import com.megna.backend.interfaces.rest.dto.auth.SellerRegisterResponseDto;
import com.megna.backend.domain.entity.Investor;
import com.megna.backend.domain.entity.Seller;
import com.megna.backend.domain.enums.InvestorStatus;
import com.megna.backend.domain.enums.SellerStatus;
import com.megna.backend.domain.repository.AdminRepository;
import com.megna.backend.domain.repository.InvestorRepository;
import com.megna.backend.domain.repository.PasswordResetTokenRepository;
import com.megna.backend.domain.repository.SellerRepository;
import com.megna.backend.infrastructure.security.jwt.JwtService;
import lombok.RequiredArgsConstructor;
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
import java.util.Locale;
import java.util.function.Consumer;

@Service
@RequiredArgsConstructor
public class AuthService {

    private static final String PRINCIPAL_INVESTOR = "INVESTOR";
    private static final String PRINCIPAL_SELLER = "SELLER";
    private static final String INVALID_RESET_TOKEN_MESSAGE = "Invalid or expired reset token";
    private static final String RESET_PASSWORD_EMAIL_SUBJECT = "Reset your Megna password";
    private static final int RESET_TOKEN_BYTE_LENGTH = 32;
    private static final SecureRandom SECURE_RANDOM = new SecureRandom();

    private final InvestorRepository investorRepository;
    private final SellerRepository sellerRepository;
    private final AdminRepository adminRepository;
    private final PasswordResetTokenRepository passwordResetTokenRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;
    private final TransactionalEmailService transactionalEmailService;
    private final AuthProperties authProperties;

    public LoginResponseDto login(LoginRequestDto dto) {
        String email = normalizeEmail(dto.email());

        var adminOpt = adminRepository.findByEmail(email);
        if (adminOpt.isPresent()) {
            var admin = adminOpt.get();
            if (!passwordEncoder.matches(dto.password(), admin.getPasswordHash())) {
                throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid credentials");
            }

            String token = jwtService.generateAccessToken(admin);
            return new LoginResponseDto(token, "Bearer", jwtService.getAccessTokenTtlSeconds());
        }

        var investorOpt = investorRepository.findByEmail(email);
        if (investorOpt.isPresent()) {
            Investor investor = investorOpt.get();

            if (!passwordEncoder.matches(dto.password(), investor.getPasswordHash())) {
                throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid credentials");
            }

            String token = jwtService.generateAccessToken(investor);
            return new LoginResponseDto(token, "Bearer", jwtService.getAccessTokenTtlSeconds());
        }

        Seller seller = sellerRepository.findByEmail(email)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid credentials"));

        if (!passwordEncoder.matches(dto.password(), seller.getPasswordHash())) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid credentials");
        }

        String token = jwtService.generateAccessToken(seller);
        return new LoginResponseDto(token, "Bearer", jwtService.getAccessTokenTtlSeconds());
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

        if ("ADMIN".equals(role)) {
            var admin = adminRepository.findById(principal.userId())
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Not authenticated"));
            updatePassword(admin.getPasswordHash(), currentPassword, newPassword, admin::setPasswordHash);
            adminRepository.save(admin);
            return;
        }

        if ("INVESTOR".equals(role)) {
            var investor = investorRepository.findById(principal.userId())
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Not authenticated"));
            updatePassword(investor.getPasswordHash(), currentPassword, newPassword, investor::setPasswordHash);
            investorRepository.save(investor);
            return;
        }

        if ("SELLER".equals(role)) {
            var seller = sellerRepository.findById(principal.userId())
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Not authenticated"));
            updatePassword(seller.getPasswordHash(), currentPassword, newPassword, seller::setPasswordHash);
            sellerRepository.save(seller);
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

        String rawToken = generateResetToken();
        PasswordResetToken resetToken = new PasswordResetToken();
        resetToken.setPrincipalType(principal.type());
        resetToken.setPrincipalId(principal.id());
        resetToken.setTokenHash(hashToken(rawToken));
        resetToken.setExpiresAt(LocalDateTime.now().plusMinutes(resolvePasswordResetTtlMinutes()));
        passwordResetTokenRepository.save(resetToken);

        try {
            transactionalEmailService.sendTransactional(new TransactionalEmailRequest(
                    principal.email(),
                    RESET_PASSWORD_EMAIL_SUBJECT,
                    buildPasswordResetBody(principal.email(), rawToken)
            ));
        } catch (RuntimeException ignored) {
            // Keep the endpoint response generic and successful even if email delivery fails.
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

        String principalType = resetToken.getPrincipalType() == null
                ? ""
                : resetToken.getPrincipalType().trim().toUpperCase(Locale.US);

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

    private String normalizeEmail(String email) {
        if (email == null) return "";
        return email.trim().toLowerCase(Locale.US);
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

    private String buildPasswordResetBody(String recipientEmail, String rawToken) {
        String resetLink = buildPasswordResetLink(rawToken);
        long ttlMinutes = resolvePasswordResetTtlMinutes();
        return String.join("\n",
                "We received a request to reset the password for your Megna account.",
                "",
                "Email: " + recipientEmail,
                "",
                "Use this link to reset your password:",
                resetLink,
                "",
                "This link expires in " + ttlMinutes + " minutes.",
                "If you did not request this, you can ignore this email."
        );
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

    private String generateResetToken() {
        byte[] bytes = new byte[RESET_TOKEN_BYTE_LENGTH];
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

    private record PrincipalRef(String type, Long id, String email) {}
}

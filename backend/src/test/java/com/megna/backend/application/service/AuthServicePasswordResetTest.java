package com.megna.backend.application.service;

import com.megna.backend.application.service.email.TransactionalEmailRequest;
import com.megna.backend.application.service.email.TransactionalEmailService;
import com.megna.backend.domain.entity.Admin;
import com.megna.backend.domain.entity.Investor;
import com.megna.backend.domain.entity.PasswordResetToken;
import com.megna.backend.domain.repository.AdminRepository;
import com.megna.backend.domain.repository.InvestorRepository;
import com.megna.backend.domain.repository.PasswordResetTokenRepository;
import com.megna.backend.domain.repository.RefreshTokenRepository;
import com.megna.backend.domain.repository.SellerRepository;
import com.megna.backend.infrastructure.config.AuthProperties;
import com.megna.backend.infrastructure.config.ContactProperties;
import com.megna.backend.infrastructure.security.jwt.JwtService;
import com.megna.backend.interfaces.rest.dto.auth.ForgotPasswordRequestDto;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.net.URLDecoder;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.LocalDateTime;
import java.util.HexFormat;
import java.util.Map;
import java.util.Optional;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class AuthServicePasswordResetTest {

    @Mock
    private InvestorRepository investorRepository;

    @Mock
    private SellerRepository sellerRepository;

    @Mock
    private AdminRepository adminRepository;

    @Mock
    private PasswordResetTokenRepository passwordResetTokenRepository;

    @Mock
    private RefreshTokenRepository refreshTokenRepository;

    @Mock
    private PasswordEncoder passwordEncoder;

    @Mock
    private JwtService jwtService;

    @Mock
    private TransactionalEmailService transactionalEmailService;

    @Mock
    private AuthProperties authProperties;

    @Mock
    private ContactProperties contactProperties;

    @Mock
    private EmailTemplateAssets emailTemplateAssets;

    @Test
    void requestPasswordResetShouldStoreHashedTokenAndSendEmailLink() {
        AuthService authService = newAuthService();
        String email = "investor@example.com";
        LocalDateTime startedAt = LocalDateTime.now();

        Investor investor = new Investor();
        investor.setId(41L);
        investor.setEmail(email);

        when(investorRepository.findByEmail(email)).thenReturn(Optional.of(investor));
        when(authProperties.getPasswordResetTokenTtlMinutes()).thenReturn(30L);
        when(authProperties.getPasswordResetUrlBase()).thenReturn("https://megna.us/reset-password");
        when(passwordResetTokenRepository.save(any(PasswordResetToken.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(transactionalEmailService.sendTransactional(any(TransactionalEmailRequest.class))).thenReturn(true);

        authService.requestPasswordReset(new ForgotPasswordRequestDto(email));

        ArgumentCaptor<PasswordResetToken> savedTokenCaptor = ArgumentCaptor.forClass(PasswordResetToken.class);
        verify(passwordResetTokenRepository).save(savedTokenCaptor.capture());
        PasswordResetToken savedToken = savedTokenCaptor.getValue();

        verify(passwordResetTokenRepository).deleteByPrincipalTypeAndPrincipalIdAndUsedAtIsNull("INVESTOR", 41L);
        assertEquals("INVESTOR", savedToken.getPrincipalType());
        assertEquals(41L, savedToken.getPrincipalId());
        assertEquals(64, savedToken.getTokenHash().length());
        assertTrue(savedToken.getExpiresAt().isAfter(startedAt.plusMinutes(29)));
        assertTrue(savedToken.getExpiresAt().isBefore(startedAt.plusMinutes(31)));

        ArgumentCaptor<TransactionalEmailRequest> emailCaptor = ArgumentCaptor.forClass(TransactionalEmailRequest.class);
        verify(transactionalEmailService).sendTransactional(emailCaptor.capture());
        TransactionalEmailRequest request = emailCaptor.getValue();

        assertEquals(email, request.to());
        assertEquals("reset-password-cid-v1", request.templateAlias());
        assertTrue(request.subject() == null || request.subject().isBlank());

        @SuppressWarnings("unchecked")
        Map<String, Object> templateModel = (Map<String, Object>) request.templateModel();
        String actionUrl = templateModel.get("action_url").toString();
        assertTrue(actionUrl.contains("https://megna.us/reset-password?token="));

        Matcher matcher = Pattern.compile("token=([^\\s]+)").matcher(actionUrl);
        assertTrue(matcher.find());
        String rawToken = URLDecoder.decode(matcher.group(1), StandardCharsets.UTF_8);

        assertNotEquals(rawToken, savedToken.getTokenHash());
        assertEquals(sha256(rawToken), savedToken.getTokenHash());
    }

    @Test
    void requestPasswordResetShouldPreferInvestorWhenEmailExistsInBothRoles() {
        AuthService authService = newAuthService();
        String email = "duplicate@example.com";

        Investor investor = new Investor();
        investor.setId(10L);
        investor.setEmail(email);

        when(investorRepository.findByEmail(email)).thenReturn(Optional.of(investor));
        when(authProperties.getPasswordResetTokenTtlMinutes()).thenReturn(30L);
        when(authProperties.getPasswordResetUrlBase()).thenReturn("https://megna.us/reset-password");
        when(passwordResetTokenRepository.save(any(PasswordResetToken.class))).thenAnswer(invocation -> invocation.getArgument(0));

        authService.requestPasswordReset(new ForgotPasswordRequestDto(email));

        ArgumentCaptor<PasswordResetToken> savedTokenCaptor = ArgumentCaptor.forClass(PasswordResetToken.class);
        verify(passwordResetTokenRepository).save(savedTokenCaptor.capture());
        PasswordResetToken savedToken = savedTokenCaptor.getValue();

        assertEquals("INVESTOR", savedToken.getPrincipalType());
        assertEquals(10L, savedToken.getPrincipalId());
        verify(sellerRepository, never()).findByEmail(eq(email));
    }

    @Test
    void requestPasswordResetShouldStoreHashedPasscodeAndEmailAdmin() {
        AuthService authService = newAuthService();
        String email = "admin@example.com";
        Admin admin = new Admin();
        admin.setId(7L);
        admin.setEmail(email);

        when(adminRepository.findByEmail(email)).thenReturn(Optional.of(admin));
        when(authProperties.getAdminPasswordResetCodeTtlMinutes()).thenReturn(10L);
        when(authProperties.getPasswordResetUrlBase()).thenReturn("https://megna.us/reset-password");
        when(passwordEncoder.encode(any(String.class))).thenAnswer(invocation ->
                "encoded:" + invocation.getArgument(0, String.class));
        when(passwordResetTokenRepository.save(any(PasswordResetToken.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));
        when(transactionalEmailService.sendTransactional(any(TransactionalEmailRequest.class))).thenReturn(true);

        authService.requestPasswordReset(new ForgotPasswordRequestDto(email));

        ArgumentCaptor<PasswordResetToken> tokenCaptor = ArgumentCaptor.forClass(PasswordResetToken.class);
        verify(passwordResetTokenRepository).save(tokenCaptor.capture());
        PasswordResetToken savedToken = tokenCaptor.getValue();
        assertEquals("ADMIN", savedToken.getPrincipalType());
        assertEquals(7L, savedToken.getPrincipalId());
        assertTrue(savedToken.getExpiresAt().isAfter(LocalDateTime.now().plusMinutes(9)));

        ArgumentCaptor<TransactionalEmailRequest> emailCaptor =
                ArgumentCaptor.forClass(TransactionalEmailRequest.class);
        verify(transactionalEmailService).sendTransactional(emailCaptor.capture());
        TransactionalEmailRequest request = emailCaptor.getValue();
        Matcher passcodeMatcher = Pattern.compile("one-time passcode is: (\\d{6})")
                .matcher(request.textBody());
        assertTrue(passcodeMatcher.find());
        String passcode = passcodeMatcher.group(1);
        assertEquals("encoded:" + passcode, savedToken.getTokenHash());
        assertEquals("Your Megna admin password reset code", request.subject());
        assertTrue(request.textBody().contains(
                "https://megna.us/reset-password?email=admin%40example.com"
        ));
    }

    private AuthService newAuthService() {
        return new AuthService(
                investorRepository,
                sellerRepository,
                adminRepository,
                passwordResetTokenRepository,
                refreshTokenRepository,
                passwordEncoder,
                jwtService,
                transactionalEmailService,
                authProperties,
                contactProperties,
                emailTemplateAssets
        );
    }

    private String sha256(String value) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            return HexFormat.of().formatHex(digest.digest(value.getBytes(StandardCharsets.UTF_8)));
        } catch (NoSuchAlgorithmException ex) {
            throw new IllegalStateException("SHA-256 is not available", ex);
        }
    }
}

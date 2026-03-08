package com.megna.backend.application.service;

import com.megna.backend.application.service.email.TransactionalEmailRequest;
import com.megna.backend.application.service.email.TransactionalEmailService;
import com.megna.backend.domain.entity.Investor;
import com.megna.backend.domain.entity.PasswordResetToken;
import com.megna.backend.domain.repository.AdminRepository;
import com.megna.backend.domain.repository.InvestorRepository;
import com.megna.backend.domain.repository.PasswordResetTokenRepository;
import com.megna.backend.domain.repository.RefreshTokenRepository;
import com.megna.backend.domain.repository.SellerRepository;
import com.megna.backend.infrastructure.config.AuthProperties;
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
import static org.mockito.Mockito.verifyNoInteractions;
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
        when(authProperties.getPasswordResetUrlBase()).thenReturn("https://megna-realestate.com/reset-password");
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
        assertEquals("Reset your Megna password", request.subject());
        assertTrue(request.textBody().contains("https://megna-realestate.com/reset-password?token="));

        Matcher matcher = Pattern.compile("token=([^\\s]+)").matcher(request.textBody());
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
        when(authProperties.getPasswordResetUrlBase()).thenReturn("https://megna-realestate.com/reset-password");
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
    void requestPasswordResetShouldIgnoreAdminAccounts() {
        AuthService authService = newAuthService();
        String email = "admin@example.com";

        when(investorRepository.findByEmail(email)).thenReturn(Optional.empty());
        when(sellerRepository.findByEmail(email)).thenReturn(Optional.empty());

        authService.requestPasswordReset(new ForgotPasswordRequestDto(email));

        verify(passwordResetTokenRepository, never()).save(any());
        verify(transactionalEmailService, never()).sendTransactional(any());
        verifyNoInteractions(adminRepository);
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
                authProperties
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

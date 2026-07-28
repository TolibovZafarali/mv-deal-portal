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

import java.time.LocalDateTime;
import java.util.Map;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
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
    void requestPasswordResetShouldStoreHashedPasscodeAndSendTemplateForInvestor() {
        AuthService authService = newAuthService();
        String email = "investor@example.com";
        LocalDateTime startedAt = LocalDateTime.now();

        Investor investor = new Investor();
        investor.setId(41L);
        investor.setEmail(email);

        when(investorRepository.findByEmail(email)).thenReturn(Optional.of(investor));
        when(authProperties.getPasswordResetCodeTtlMinutes()).thenReturn(10L);
        when(authProperties.getPasswordResetUrlBase()).thenReturn("https://megna.us/reset-password");
        when(passwordEncoder.encode(any(String.class))).thenAnswer(invocation ->
                "encoded:" + invocation.getArgument(0, String.class));
        when(passwordResetTokenRepository.save(any(PasswordResetToken.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(transactionalEmailService.sendTransactional(any(TransactionalEmailRequest.class))).thenReturn(true);

        authService.requestPasswordReset(new ForgotPasswordRequestDto(email));

        ArgumentCaptor<PasswordResetToken> savedTokenCaptor = ArgumentCaptor.forClass(PasswordResetToken.class);
        verify(passwordResetTokenRepository).save(savedTokenCaptor.capture());
        PasswordResetToken savedToken = savedTokenCaptor.getValue();

        verify(passwordResetTokenRepository).deleteByPrincipalTypeAndPrincipalIdAndUsedAtIsNull("INVESTOR", 41L);
        assertEquals("INVESTOR", savedToken.getPrincipalType());
        assertEquals(41L, savedToken.getPrincipalId());
        assertTrue(savedToken.getExpiresAt().isAfter(startedAt.plusMinutes(9)));
        assertTrue(savedToken.getExpiresAt().isBefore(startedAt.plusMinutes(11)));

        ArgumentCaptor<TransactionalEmailRequest> emailCaptor = ArgumentCaptor.forClass(TransactionalEmailRequest.class);
        verify(transactionalEmailService).sendTransactional(emailCaptor.capture());
        TransactionalEmailRequest request = emailCaptor.getValue();

        assertEquals(email, request.to());
        assertEquals("reset-password-cid-v1", request.templateAlias());
        assertTrue(request.subject() == null || request.subject().isBlank());

        @SuppressWarnings("unchecked")
        Map<String, Object> templateModel = (Map<String, Object>) request.templateModel();
        String passcode = templateModel.get("passcode").toString();
        assertTrue(passcode.matches("[0-9]{6}"));
        assertEquals("encoded:" + passcode, savedToken.getTokenHash());
        assertEquals("Your Megna password reset code", templateModel.get("subject"));
        String actionUrl = templateModel.get("action_url").toString();
        assertEquals("https://megna.us/reset-password?email=investor%40example.com", actionUrl);
    }

    @Test
    void requestPasswordResetShouldPreferInvestorWhenEmailExistsInBothRoles() {
        AuthService authService = newAuthService();
        String email = "duplicate@example.com";

        Investor investor = new Investor();
        investor.setId(10L);
        investor.setEmail(email);

        when(investorRepository.findByEmail(email)).thenReturn(Optional.of(investor));
        when(authProperties.getPasswordResetCodeTtlMinutes()).thenReturn(10L);
        when(authProperties.getPasswordResetUrlBase()).thenReturn("https://megna.us/reset-password");
        when(passwordEncoder.encode(any(String.class))).thenReturn("encoded-passcode");
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
        when(authProperties.getPasswordResetCodeTtlMinutes()).thenReturn(10L);
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
        assertEquals("reset-password-cid-v1", request.templateAlias());
        @SuppressWarnings("unchecked")
        Map<String, Object> templateModel = (Map<String, Object>) request.templateModel();
        String passcode = templateModel.get("passcode").toString();
        assertTrue(passcode.matches("[0-9]{6}"));
        assertEquals("encoded:" + passcode, savedToken.getTokenHash());
        assertEquals("Your Megna password reset code", templateModel.get("subject"));
        assertEquals(
                "https://megna.us/reset-password?email=admin%40example.com",
                templateModel.get("action_url")
        );
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
}

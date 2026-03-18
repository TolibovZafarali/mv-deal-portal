package com.megna.backend.application.service;

import com.megna.backend.application.service.email.TransactionalEmailRequest;
import com.megna.backend.application.service.email.TransactionalEmailService;
import com.megna.backend.domain.entity.Investor;
import com.megna.backend.domain.repository.AdminRepository;
import com.megna.backend.domain.repository.InvestorRepository;
import com.megna.backend.domain.repository.PasswordResetTokenRepository;
import com.megna.backend.domain.repository.RefreshTokenRepository;
import com.megna.backend.domain.repository.SellerRepository;
import com.megna.backend.infrastructure.config.AuthProperties;
import com.megna.backend.infrastructure.config.ContactProperties;
import com.megna.backend.infrastructure.security.jwt.JwtService;
import com.megna.backend.interfaces.rest.dto.auth.RegisterRequestDto;
import com.megna.backend.interfaces.rest.dto.auth.RegisterResponseDto;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.util.List;
import java.util.Map;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class AuthServiceRegistrationEmailTest {

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

    @Test
    void registerInvestorShouldSendUnderReviewAndAdminNotificationEmails() {
        AuthService authService = newAuthService();
        RegisterRequestDto request = new RegisterRequestDto(
                "John",
                "Doe",
                "Acme Capital",
                "john.doe@example.com",
                "+1 555 000 1111",
                "Password123!"
        );

        when(adminRepository.existsByEmail("john.doe@example.com")).thenReturn(false);
        when(investorRepository.findByEmail("john.doe@example.com")).thenReturn(Optional.empty());
        when(sellerRepository.existsByEmail("john.doe@example.com")).thenReturn(false);
        when(passwordEncoder.encode("Password123!")).thenReturn("encoded-password");
        when(investorRepository.save(any(Investor.class))).thenAnswer(invocation -> {
            Investor investor = invocation.getArgument(0);
            investor.setId(42L);
            return investor;
        });
        when(contactProperties.getInvestorInbox()).thenReturn("investors@megna.us");
        when(transactionalEmailService.sendTransactional(any(TransactionalEmailRequest.class))).thenReturn(true);

        RegisterResponseDto response = authService.registerInvestor(request);

        assertEquals(42L, response.investorId());
        assertEquals("john.doe@example.com", response.email());
        assertEquals("PENDING", response.status());

        ArgumentCaptor<TransactionalEmailRequest> emailCaptor = ArgumentCaptor.forClass(TransactionalEmailRequest.class);
        verify(transactionalEmailService, times(2)).sendTransactional(emailCaptor.capture());
        List<TransactionalEmailRequest> emailRequests = emailCaptor.getAllValues();
        assertEquals(2, emailRequests.size());

        TransactionalEmailRequest investorEmailRequest = emailRequests.get(0);
        TransactionalEmailRequest adminEmailRequest = emailRequests.get(1);

        assertEquals("john.doe@example.com", investorEmailRequest.to());
        assertEquals("investor-signup-under-review-cid-v1", investorEmailRequest.templateAlias());

        @SuppressWarnings("unchecked")
        Map<String, Object> investorModel = (Map<String, Object>) investorEmailRequest.templateModel();
        assertEquals("Welcome to Megna - your account is under review", investorModel.get("subject"));
        assertEquals("Welcome to Megna, John", investorModel.get("title"));
        assertEquals(
                "Thanks for signing up. Your account is now under review by the Megna Team, and one of our team members will reach out to you shortly.",
                investorModel.get("message")
        );

        assertEquals("investors@megna.us", adminEmailRequest.to());
        assertEquals("admin-investor-signup-created-cid-v1", adminEmailRequest.templateAlias());
        assertEquals("New investor signup", adminEmailRequest.templateModel().get("subject"));
        assertEquals("A new investor signed up", adminEmailRequest.templateModel().get("title"));
        assertEquals("42", adminEmailRequest.templateModel().get("investor_id"));
        assertEquals("John Doe", adminEmailRequest.templateModel().get("investor_name"));
        assertEquals("john.doe@example.com", adminEmailRequest.templateModel().get("investor_email"));
        assertEquals("Acme Capital", adminEmailRequest.templateModel().get("company_name"));
        assertEquals("+1 555 000 1111", adminEmailRequest.templateModel().get("phone"));
        assertEquals("PENDING", adminEmailRequest.templateModel().get("status"));
        assertEquals("Open Investor Reviews", adminEmailRequest.templateModel().get("action_text"));
        assertEquals("https://megna.us/admin/investors", adminEmailRequest.templateModel().get("action_url"));
        assertTrue(adminEmailRequest.templateModel().get("registered_at").toString().endsWith("CT"));
    }

    @Test
    void registerInvestorShouldStillSucceedWhenEmailSendThrows() {
        AuthService authService = newAuthService();
        RegisterRequestDto request = new RegisterRequestDto(
                "John",
                "Doe",
                "Acme Capital",
                "john.doe@example.com",
                "+1 555 000 1111",
                "Password123!"
        );

        when(adminRepository.existsByEmail("john.doe@example.com")).thenReturn(false);
        when(investorRepository.findByEmail("john.doe@example.com")).thenReturn(Optional.empty());
        when(sellerRepository.existsByEmail("john.doe@example.com")).thenReturn(false);
        when(passwordEncoder.encode("Password123!")).thenReturn("encoded-password");
        when(investorRepository.save(any(Investor.class))).thenAnswer(invocation -> {
            Investor investor = invocation.getArgument(0);
            investor.setId(42L);
            return investor;
        });
        when(contactProperties.getInvestorInbox()).thenReturn("investors@megna.us");
        when(transactionalEmailService.sendTransactional(any(TransactionalEmailRequest.class)))
                .thenThrow(new RuntimeException("boom"));

        RegisterResponseDto response = authService.registerInvestor(request);

        assertEquals(42L, response.investorId());
        assertEquals("john.doe@example.com", response.email());
        assertEquals("PENDING", response.status());
        verify(transactionalEmailService, times(2)).sendTransactional(any(TransactionalEmailRequest.class));
    }

    @Test
    void registerInvestorShouldAllowMissingCompanyName() {
        AuthService authService = newAuthService();
        RegisterRequestDto request = new RegisterRequestDto(
                "John",
                "Doe",
                null,
                "john.doe@example.com",
                "+1 555 000 1111",
                "Password123!"
        );

        when(adminRepository.existsByEmail("john.doe@example.com")).thenReturn(false);
        when(investorRepository.findByEmail("john.doe@example.com")).thenReturn(Optional.empty());
        when(sellerRepository.existsByEmail("john.doe@example.com")).thenReturn(false);
        when(passwordEncoder.encode("Password123!")).thenReturn("encoded-password");
        when(investorRepository.save(any(Investor.class))).thenAnswer(invocation -> {
            Investor investor = invocation.getArgument(0);
            investor.setId(42L);
            return investor;
        });
        when(transactionalEmailService.sendTransactional(any(TransactionalEmailRequest.class))).thenReturn(true);

        RegisterResponseDto response = authService.registerInvestor(request);

        assertEquals(42L, response.investorId());
        assertEquals("john.doe@example.com", response.email());
        assertEquals("PENDING", response.status());

        ArgumentCaptor<Investor> investorCaptor = ArgumentCaptor.forClass(Investor.class);
        verify(investorRepository).save(investorCaptor.capture());
        Investor savedInvestor = investorCaptor.getValue();
        assertNotNull(savedInvestor);
        assertEquals("", savedInvestor.getCompanyName());
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
                contactProperties
        );
    }
}

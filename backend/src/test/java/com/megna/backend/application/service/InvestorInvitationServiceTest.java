package com.megna.backend.application.service;

import com.megna.backend.domain.entity.Investor;
import com.megna.backend.domain.entity.InvestorInvitation;
import com.megna.backend.domain.enums.InvestorInvitationStatus;
import com.megna.backend.domain.enums.InvestorStatus;
import com.megna.backend.domain.repository.AdminRepository;
import com.megna.backend.domain.repository.InvestorInvitationRepository;
import com.megna.backend.domain.repository.InvestorRepository;
import com.megna.backend.domain.repository.SellerRepository;
import com.megna.backend.infrastructure.config.AuthProperties;
import com.megna.backend.infrastructure.config.EmailProperties;
import com.megna.backend.infrastructure.security.AuthPrincipal;
import com.megna.backend.interfaces.rest.dto.auth.RegisterResponseDto;
import com.megna.backend.interfaces.rest.dto.invitation.AdminInvestorInvitationBatchRequestDto;
import com.megna.backend.interfaces.rest.dto.invitation.AdminInvestorInvitationBatchResponseDto;
import com.megna.backend.interfaces.rest.dto.invitation.InvestorInvitationAcceptRequestDto;
import com.megna.backend.interfaces.rest.dto.invitation.InvestorInvitationRequestDto;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class InvestorInvitationServiceTest {

    @Mock
    private InvestorInvitationRepository investorInvitationRepository;

    @Mock
    private AdminRepository adminRepository;

    @Mock
    private InvestorRepository investorRepository;

    @Mock
    private SellerRepository sellerRepository;

    @Mock
    private com.megna.backend.application.service.email.TransactionalEmailService transactionalEmailService;

    @Mock
    private PasswordEncoder passwordEncoder;

    private InvestorInvitationService investorInvitationService;

    @BeforeEach
    void setUp() {
        AuthProperties authProperties = new AuthProperties();
        authProperties.setInvitationUrlBase("http://localhost:5173/invite/accept");
        authProperties.setInvitationTtlDays(7);

        EmailProperties emailProperties = new EmailProperties();
        emailProperties.setFromAddress("contact@megna.us");

        investorInvitationService = new InvestorInvitationService(
                investorInvitationRepository,
                adminRepository,
                investorRepository,
                sellerRepository,
                transactionalEmailService,
                authProperties,
                emailProperties,
                passwordEncoder
        );
    }

    @AfterEach
    void tearDown() {
        SecurityContextHolder.clearContext();
    }

    @Test
    void sendInvitationsSkipsDuplicatesAndExistingAccountsAndResendsPendingInvite() {
        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken(new AuthPrincipal("admin@megna.us", 7L, "ADMIN"), null, List.of())
        );

        InvestorInvitation pendingInvite = new InvestorInvitation();
        pendingInvite.setId(11L);
        pendingInvite.setFirstName("Jane");
        pendingInvite.setLastName("Original");
        pendingInvite.setEmail("jane@example.com");
        pendingInvite.setStatus(InvestorInvitationStatus.PENDING);
        pendingInvite.setExpiresAt(LocalDateTime.now().plusDays(2));
        pendingInvite.setCreatedByAdminId(7L);

        when(adminRepository.existsByEmail(anyString())).thenReturn(false);
        when(sellerRepository.existsByEmail(anyString())).thenReturn(false);
        when(investorRepository.existsByEmail("existing@example.com")).thenReturn(true);
        when(investorRepository.existsByEmail("john@example.com")).thenReturn(false);
        when(investorRepository.existsByEmail("jane@example.com")).thenReturn(false);

        when(investorInvitationRepository.findByEmailAndStatusOrderByCreatedAtDesc("john@example.com", InvestorInvitationStatus.PENDING))
                .thenReturn(List.of());
        when(investorInvitationRepository.findByEmailAndStatusOrderByCreatedAtDesc("jane@example.com", InvestorInvitationStatus.PENDING))
                .thenReturn(List.of(pendingInvite));
        when(transactionalEmailService.sendTransactional(any())).thenReturn(true);
        when(investorInvitationRepository.save(any(InvestorInvitation.class))).thenAnswer(invocation -> invocation.getArgument(0));

        AdminInvestorInvitationBatchResponseDto response = investorInvitationService.sendInvitations(
                new AdminInvestorInvitationBatchRequestDto(List.of(
                        new InvestorInvitationRequestDto("John", "Stone", "john@example.com"),
                        new InvestorInvitationRequestDto("Jane", "Miles", "jane@example.com"),
                        new InvestorInvitationRequestDto("Duplicate", "John", "JOHN@example.com"),
                        new InvestorInvitationRequestDto("Existing", "User", "existing@example.com")
                ))
        );

        assertEquals(4, response.requestedCount());
        assertEquals(1, response.sentCount());
        assertEquals(1, response.resentCount());
        assertEquals(1, response.skippedDuplicateCount());
        assertEquals(1, response.skippedExistingAccountCount());
        assertEquals(0, response.failedCount());
        assertEquals(4, response.results().size());

        verify(investorInvitationRepository, times(2)).save(any(InvestorInvitation.class));
    }

    @Test
    void acceptInvitationCreatesApprovedInvestorAndMarksInvitationAccepted() {
        InvestorInvitation invitation = new InvestorInvitation();
        invitation.setId(21L);
        invitation.setFirstName("John");
        invitation.setLastName("Stone");
        invitation.setEmail("john@example.com");
        invitation.setStatus(InvestorInvitationStatus.PENDING);
        invitation.setExpiresAt(LocalDateTime.now().plusDays(1));
        invitation.setCreatedByAdminId(7L);

        when(investorInvitationRepository.findByTokenHashAndStatus(anyString(), eq(InvestorInvitationStatus.PENDING)))
                .thenReturn(Optional.of(invitation));
        when(adminRepository.existsByEmail("john@example.com")).thenReturn(false);
        when(sellerRepository.existsByEmail("john@example.com")).thenReturn(false);
        when(investorRepository.existsByEmail("john@example.com")).thenReturn(false);
        when(passwordEncoder.encode("StrongPass1")).thenReturn("hashed-password");
        when(investorRepository.save(any(Investor.class))).thenAnswer(invocation -> {
            Investor investor = invocation.getArgument(0);
            investor.setId(88L);
            return investor;
        });
        when(investorInvitationRepository.save(any(InvestorInvitation.class))).thenAnswer(invocation -> invocation.getArgument(0));

        RegisterResponseDto response = investorInvitationService.acceptInvitation(
                "raw-token",
                new InvestorInvitationAcceptRequestDto("Stone Capital", "(312) 555-1000", "StrongPass1")
        );

        assertEquals(88L, response.investorId());
        assertEquals("john@example.com", response.email());
        assertEquals("APPROVED", response.status());

        ArgumentCaptor<Investor> investorCaptor = ArgumentCaptor.forClass(Investor.class);
        verify(investorRepository).save(investorCaptor.capture());

        Investor savedInvestor = investorCaptor.getValue();
        assertEquals("John", savedInvestor.getFirstName());
        assertEquals("Stone", savedInvestor.getLastName());
        assertEquals("john@example.com", savedInvestor.getEmail());
        assertEquals("john@example.com", savedInvestor.getNotificationEmail());
        assertEquals(InvestorStatus.APPROVED, savedInvestor.getStatus());
        assertNotNull(savedInvestor.getApprovedAt());

        assertEquals(InvestorInvitationStatus.ACCEPTED, invitation.getStatus());
        assertEquals(88L, invitation.getInvestorId());
        assertNotNull(invitation.getAcceptedAt());
    }

    @Test
    void acceptInvitationMarksExpiredTokenAndRejectsIt() {
        InvestorInvitation invitation = new InvestorInvitation();
        invitation.setId(31L);
        invitation.setFirstName("Expired");
        invitation.setLastName("Invite");
        invitation.setEmail("expired@example.com");
        invitation.setStatus(InvestorInvitationStatus.PENDING);
        invitation.setExpiresAt(LocalDateTime.now().minusMinutes(5));
        invitation.setCreatedByAdminId(7L);

        when(investorInvitationRepository.findByTokenHashAndStatus(anyString(), eq(InvestorInvitationStatus.PENDING)))
                .thenReturn(Optional.of(invitation));
        when(investorInvitationRepository.save(any(InvestorInvitation.class))).thenAnswer(invocation -> invocation.getArgument(0));

        ResponseStatusException exception = assertThrows(
                ResponseStatusException.class,
                () -> investorInvitationService.acceptInvitation(
                        "expired-token",
                        new InvestorInvitationAcceptRequestDto("", "(312) 555-2000", "StrongPass1")
                )
        );

        assertEquals(404, exception.getStatusCode().value());
        assertTrue(exception.getReason().contains("invalid or expired"));
        assertEquals(InvestorInvitationStatus.EXPIRED, invitation.getStatus());
        verify(investorInvitationRepository).save(invitation);
        verify(investorRepository, never()).save(any(Investor.class));
    }
}

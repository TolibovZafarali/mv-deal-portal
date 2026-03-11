package com.megna.backend.application.service;

import com.megna.backend.application.service.email.TransactionalEmailRequest;
import com.megna.backend.application.service.email.TransactionalEmailService;
import com.megna.backend.domain.entity.Investor;
import com.megna.backend.domain.enums.InvestorStatus;
import com.megna.backend.domain.repository.InvestorRepository;
import com.megna.backend.infrastructure.security.AuthPrincipal;
import com.megna.backend.interfaces.rest.dto.investor.InvestorResponseDto;
import com.megna.backend.interfaces.rest.dto.investor.InvestorStatusUpdateRequestDto;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;

import java.util.Map;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class InvestorServiceApprovalEmailTest {

    @Mock
    private InvestorRepository investorRepository;

    @Mock
    private TransactionalEmailService transactionalEmailService;

    @InjectMocks
    private InvestorService investorService;

    @BeforeEach
    void setUpSecurityContext() {
        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken(
                        new AuthPrincipal("admin@test.local", 1L, "ADMIN"),
                        null
                )
        );
    }

    @AfterEach
    void clearSecurityContext() {
        SecurityContextHolder.clearContext();
    }

    @Test
    void updateStatusSendsWelcomeEmailWhenPendingInvestorIsApproved() {
        Investor investor = investor(10L, InvestorStatus.PENDING, "John", "john@example.com", "");
        when(investorRepository.findById(10L)).thenReturn(Optional.of(investor));
        when(investorRepository.save(any(Investor.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(transactionalEmailService.sendTransactional(any(TransactionalEmailRequest.class))).thenReturn(true);

        InvestorResponseDto response = investorService.updateStatus(
                10L,
                new InvestorStatusUpdateRequestDto(InvestorStatus.APPROVED)
        );

        assertEquals(InvestorStatus.APPROVED, response.status());
        assertNotNull(response.approvedAt());

        ArgumentCaptor<TransactionalEmailRequest> emailCaptor = ArgumentCaptor.forClass(TransactionalEmailRequest.class);
        verify(transactionalEmailService).sendTransactional(emailCaptor.capture());
        TransactionalEmailRequest emailRequest = emailCaptor.getValue();

        assertEquals("john@example.com", emailRequest.to());
        assertEquals("welcome-cid-v1", emailRequest.templateAlias());
        @SuppressWarnings("unchecked")
        Map<String, Object> templateModel = (Map<String, Object>) emailRequest.templateModel();
        assertEquals("Welcome to Megna", templateModel.get("subject"));
        assertEquals("Welcome to Megna, John", templateModel.get("title"));
        assertEquals("Open Investor Dashboard", templateModel.get("action_text"));
        assertEquals("https://megna.us/investor", templateModel.get("action_url"));
    }

    @Test
    void updateStatusUsesNotificationEmailAsWelcomeRecipientWhenAvailable() {
        Investor investor = investor(11L, InvestorStatus.PENDING, "Jane", "jane@example.com", "notify@example.com");
        when(investorRepository.findById(11L)).thenReturn(Optional.of(investor));
        when(investorRepository.save(any(Investor.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(transactionalEmailService.sendTransactional(any(TransactionalEmailRequest.class))).thenReturn(true);

        investorService.updateStatus(11L, new InvestorStatusUpdateRequestDto(InvestorStatus.APPROVED));

        ArgumentCaptor<TransactionalEmailRequest> emailCaptor = ArgumentCaptor.forClass(TransactionalEmailRequest.class);
        verify(transactionalEmailService).sendTransactional(emailCaptor.capture());
        assertEquals("notify@example.com", emailCaptor.getValue().to());
    }

    @Test
    void updateStatusStillApprovesInvestorWhenWelcomeEmailThrows() {
        Investor investor = investor(12L, InvestorStatus.PENDING, "Alex", "alex@example.com", null);
        when(investorRepository.findById(12L)).thenReturn(Optional.of(investor));
        when(investorRepository.save(any(Investor.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(transactionalEmailService.sendTransactional(any(TransactionalEmailRequest.class)))
                .thenThrow(new RuntimeException("boom"));

        InvestorResponseDto response = investorService.updateStatus(
                12L,
                new InvestorStatusUpdateRequestDto(InvestorStatus.APPROVED)
        );

        assertEquals(InvestorStatus.APPROVED, response.status());
        verify(transactionalEmailService).sendTransactional(any(TransactionalEmailRequest.class));
    }

    @Test
    void updateStatusDoesNotSendWelcomeEmailForIdempotentApprovedRequest() {
        Investor investor = investor(13L, InvestorStatus.APPROVED, "Sam", "sam@example.com", null);
        when(investorRepository.findById(13L)).thenReturn(Optional.of(investor));

        InvestorResponseDto response = investorService.updateStatus(
                13L,
                new InvestorStatusUpdateRequestDto(InvestorStatus.APPROVED)
        );

        assertEquals(InvestorStatus.APPROVED, response.status());
        verify(investorRepository, never()).save(any(Investor.class));
        verify(transactionalEmailService, never()).sendTransactional(any(TransactionalEmailRequest.class));
    }

    private static Investor investor(
            Long id,
            InvestorStatus status,
            String firstName,
            String email,
            String notificationEmail
    ) {
        Investor investor = new Investor();
        investor.setId(id);
        investor.setStatus(status);
        investor.setFirstName(firstName);
        investor.setLastName("User");
        investor.setCompanyName("Acme");
        investor.setEmail(email);
        investor.setNotificationEmail(notificationEmail);
        investor.setPhone("+1 555 000 1111");
        return investor;
    }
}

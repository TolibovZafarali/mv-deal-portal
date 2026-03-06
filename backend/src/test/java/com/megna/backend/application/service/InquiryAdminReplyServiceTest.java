package com.megna.backend.application.service;

import com.megna.backend.application.service.email.TransactionalEmailRequest;
import com.megna.backend.application.service.email.TransactionalEmailService;
import com.megna.backend.domain.entity.Admin;
import com.megna.backend.domain.entity.Inquiry;
import com.megna.backend.domain.entity.InquiryAdminReply;
import com.megna.backend.domain.entity.Investor;
import com.megna.backend.domain.entity.Property;
import com.megna.backend.domain.enums.EmailStatus;
import com.megna.backend.domain.enums.PropertyStatus;
import com.megna.backend.domain.repository.AdminRepository;
import com.megna.backend.domain.repository.InquiryAdminReplyRepository;
import com.megna.backend.domain.repository.InquiryRepository;
import com.megna.backend.domain.repository.InvestorRepository;
import com.megna.backend.domain.repository.PropertyRepository;
import com.megna.backend.infrastructure.security.AuthPrincipal;
import com.megna.backend.interfaces.rest.dto.admin.AdminInquiryReplyCreateRequestDto;
import com.megna.backend.interfaces.rest.dto.inquiry.InquiryAdminReplyResponseDto;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;

import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class InquiryAdminReplyServiceTest {

    @Mock
    private InquiryAdminReplyRepository inquiryAdminReplyRepository;

    @Mock
    private InquiryRepository inquiryRepository;

    @Mock
    private InvestorRepository investorRepository;

    @Mock
    private PropertyRepository propertyRepository;

    @Mock
    private AdminRepository adminRepository;

    @Mock
    private TransactionalEmailService transactionalEmailService;

    @InjectMocks
    private InquiryAdminReplyService inquiryAdminReplyService;

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
    void createSetsSentWhenEmailDeliverySucceeds() {
        Admin admin = new Admin();
        admin.setId(1L);

        Investor investor = new Investor();
        investor.setId(10L);

        Property property = new Property();
        property.setId(101L);

        Inquiry latestInquiry = new Inquiry();
        latestInquiry.setContactEmail("thread.contact@example.com");
        latestInquiry.setMessageBody("Original investor message");

        when(adminRepository.findById(1L)).thenReturn(Optional.of(admin));
        when(investorRepository.findById(10L)).thenReturn(Optional.of(investor));
        when(propertyRepository.findById(101L)).thenReturn(Optional.of(property));
        when(inquiryRepository.findTopByInvestorIdAndPropertyIdOrderByCreatedAtDescIdDesc(10L, 101L))
                .thenReturn(Optional.of(latestInquiry));
        when(transactionalEmailService.sendTransactional(any())).thenReturn(true);

        List<EmailStatus> persistedStatuses = new ArrayList<>();
        when(inquiryAdminReplyRepository.save(any(InquiryAdminReply.class))).thenAnswer(invocation -> {
            InquiryAdminReply reply = invocation.getArgument(0);
            persistedStatuses.add(reply.getEmailStatus());
            if (reply.getId() == null) {
                reply.setId(700L);
            }
            return reply;
        });

        InquiryAdminReplyResponseDto response = inquiryAdminReplyService.create(
                new AdminInquiryReplyCreateRequestDto(10L, 101L, "Thanks for reaching out.")
        );

        assertEquals(EmailStatus.SENT, response.emailStatus());
        assertEquals(List.of(EmailStatus.FAILED, EmailStatus.SENT), persistedStatuses);

        ArgumentCaptor<TransactionalEmailRequest> emailCaptor = ArgumentCaptor.forClass(TransactionalEmailRequest.class);
        verify(transactionalEmailService).sendTransactional(emailCaptor.capture());
        assertEquals("thread.contact@example.com", emailCaptor.getValue().to());
        assertTrue(emailCaptor.getValue().textBody().contains("Thanks for reaching out."));
    }

    @Test
    void createKeepsFailedWhenEmailDeliveryFails() {
        Admin admin = new Admin();
        admin.setId(1L);

        Investor investor = new Investor();
        investor.setId(10L);

        Property property = new Property();
        property.setId(101L);

        Inquiry latestInquiry = new Inquiry();
        latestInquiry.setContactEmail("thread.contact@example.com");
        latestInquiry.setMessageBody("Original investor message");

        when(adminRepository.findById(1L)).thenReturn(Optional.of(admin));
        when(investorRepository.findById(10L)).thenReturn(Optional.of(investor));
        when(propertyRepository.findById(101L)).thenReturn(Optional.of(property));
        when(inquiryRepository.findTopByInvestorIdAndPropertyIdOrderByCreatedAtDescIdDesc(10L, 101L))
                .thenReturn(Optional.of(latestInquiry));
        when(transactionalEmailService.sendTransactional(any())).thenReturn(false);
        when(inquiryAdminReplyRepository.save(any(InquiryAdminReply.class))).thenAnswer(invocation -> {
            InquiryAdminReply reply = invocation.getArgument(0);
            if (reply.getId() == null) {
                reply.setId(701L);
            }
            return reply;
        });

        InquiryAdminReplyResponseDto response = inquiryAdminReplyService.create(
                new AdminInquiryReplyCreateRequestDto(10L, 101L, "Following up from Megna Team.")
        );

        assertEquals(EmailStatus.FAILED, response.emailStatus());
        verify(inquiryAdminReplyRepository, times(1)).save(any(InquiryAdminReply.class));
    }

    @Test
    void getByInvestorIdFiltersToActivePropertiesForInvestor() {
        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken(
                        new AuthPrincipal("investor@test.local", 10L, "INVESTOR"),
                        null
                )
        );

        Pageable pageable = Pageable.unpaged();
        when(inquiryAdminReplyRepository.findByInvestorIdAndPropertyStatus(10L, PropertyStatus.ACTIVE, pageable))
                .thenReturn(Page.empty(pageable));

        inquiryAdminReplyService.getByInvestorId(10L, pageable);

        verify(inquiryAdminReplyRepository).findByInvestorIdAndPropertyStatus(10L, PropertyStatus.ACTIVE, pageable);
        verify(inquiryAdminReplyRepository, never()).findByInvestorId(any(), any());
    }

    @Test
    void getByInvestorIdUsesAllRepliesForAdmin() {
        Pageable pageable = Pageable.unpaged();
        when(inquiryAdminReplyRepository.findByInvestorId(10L, pageable)).thenReturn(Page.empty(pageable));

        inquiryAdminReplyService.getByInvestorId(10L, pageable);

        verify(inquiryAdminReplyRepository).findByInvestorId(10L, pageable);
        verify(inquiryAdminReplyRepository, never()).findByInvestorIdAndPropertyStatus(eq(10L), any(), any());
    }
}

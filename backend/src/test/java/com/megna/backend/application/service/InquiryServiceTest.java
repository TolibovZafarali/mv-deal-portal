package com.megna.backend.application.service;

import com.megna.backend.application.service.email.TransactionalEmailRequest;
import com.megna.backend.application.service.email.TransactionalEmailService;
import com.megna.backend.domain.entity.Inquiry;
import com.megna.backend.domain.entity.Investor;
import com.megna.backend.domain.entity.Property;
import com.megna.backend.domain.enums.EmailStatus;
import com.megna.backend.domain.enums.InvestorStatus;
import com.megna.backend.domain.enums.PropertyStatus;
import com.megna.backend.domain.repository.InquiryRepository;
import com.megna.backend.domain.repository.InvestorRepository;
import com.megna.backend.domain.repository.PropertyRepository;
import com.megna.backend.infrastructure.security.AuthPrincipal;
import com.megna.backend.interfaces.rest.dto.inquiry.InquiryCreateRequestDto;
import com.megna.backend.interfaces.rest.dto.inquiry.InquiryResponseDto;
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
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
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
class InquiryServiceTest {

    @Mock
    private InquiryRepository inquiryRepository;

    @Mock
    private PropertyRepository propertyRepository;

    @Mock
    private InvestorRepository investorRepository;

    @Mock
    private TransactionalEmailService transactionalEmailService;

    @InjectMocks
    private InquiryService inquiryService;

    @BeforeEach
    void setUpSecurityContext() {
        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken(
                        new AuthPrincipal("investor@test.local", 10L, "INVESTOR"),
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
        Property property = new Property();
        property.setId(101L);
        property.setStatus(PropertyStatus.ACTIVE);

        Investor investor = new Investor();
        investor.setId(10L);
        investor.setStatus(InvestorStatus.APPROVED);

        when(propertyRepository.findById(101L)).thenReturn(Optional.of(property));
        when(investorRepository.findById(10L)).thenReturn(Optional.of(investor));
        when(transactionalEmailService.sendTransactional(any())).thenReturn(true);

        List<EmailStatus> persistedStatuses = new ArrayList<>();
        when(inquiryRepository.save(any(Inquiry.class))).thenAnswer(invocation -> {
            Inquiry inquiry = invocation.getArgument(0);
            persistedStatuses.add(inquiry.getEmailStatus());
            if (inquiry.getId() == null) {
                inquiry.setId(501L);
            }
            return inquiry;
        });

        InquiryResponseDto response = inquiryService.create(sampleCreateRequest());

        assertEquals(EmailStatus.SENT, response.emailStatus());
        assertEquals(List.of(EmailStatus.FAILED, EmailStatus.SENT), persistedStatuses);

        ArgumentCaptor<TransactionalEmailRequest> emailCaptor = ArgumentCaptor.forClass(TransactionalEmailRequest.class);
        verify(transactionalEmailService).sendTransactional(emailCaptor.capture());
        assertEquals("contact@megna-realestate.com", emailCaptor.getValue().to());
        assertEquals("admin-inquiry-created-cid-v1", emailCaptor.getValue().templateAlias());
        @SuppressWarnings("unchecked")
        Map<String, Object> templateModel = (Map<String, Object>) emailCaptor.getValue().templateModel();
        assertEquals("501", templateModel.get("inquiry_id"));
        assertTrue(templateModel.get("action_url").toString().contains("/admin/inquiries/501"));
    }

    @Test
    void createKeepsFailedWhenEmailDeliveryFails() {
        Property property = new Property();
        property.setId(101L);
        property.setStatus(PropertyStatus.ACTIVE);

        Investor investor = new Investor();
        investor.setId(10L);
        investor.setStatus(InvestorStatus.APPROVED);

        when(propertyRepository.findById(101L)).thenReturn(Optional.of(property));
        when(investorRepository.findById(10L)).thenReturn(Optional.of(investor));
        when(transactionalEmailService.sendTransactional(any())).thenReturn(false);
        when(inquiryRepository.save(any(Inquiry.class))).thenAnswer(invocation -> {
            Inquiry inquiry = invocation.getArgument(0);
            if (inquiry.getId() == null) {
                inquiry.setId(601L);
            }
            return inquiry;
        });

        InquiryResponseDto response = inquiryService.create(sampleCreateRequest());

        assertEquals(EmailStatus.FAILED, response.emailStatus());
        verify(inquiryRepository, times(1)).save(any(Inquiry.class));
    }

    private InquiryCreateRequestDto sampleCreateRequest() {
        return new InquiryCreateRequestDto(
                101L,
                10L,
                "Interested in this property",
                "Please send terms and showing details.",
                "Test Contact",
                "Test Company",
                "contact@example.com",
                "+1-555-0100"
        );
    }

    @Test
    void getByInvestorIdFiltersToActivePropertiesForInvestor() {
        Pageable pageable = Pageable.unpaged();
        when(inquiryRepository.findByInvestorIdAndPropertyStatus(10L, PropertyStatus.ACTIVE, pageable))
                .thenReturn(Page.empty(pageable));

        inquiryService.getByInvestorId(10L, pageable);

        verify(inquiryRepository).findByInvestorIdAndPropertyStatus(10L, PropertyStatus.ACTIVE, pageable);
        verify(inquiryRepository, never()).findByInvestorId(any(), any());
    }

    @Test
    void getByInvestorIdKeepsAllStatusesForAdmin() {
        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken(
                        new AuthPrincipal("admin@test.local", 1L, "ADMIN"),
                        null
                )
        );

        Pageable pageable = Pageable.unpaged();
        when(inquiryRepository.findByInvestorId(10L, pageable)).thenReturn(Page.empty(pageable));

        inquiryService.getByInvestorId(10L, pageable);

        verify(inquiryRepository).findByInvestorId(10L, pageable);
        verify(inquiryRepository, never()).findByInvestorIdAndPropertyStatus(eq(10L), any(), any());
    }
}

package com.megna.backend.application.service;

import com.megna.backend.application.service.email.TransactionalEmailRequest;
import com.megna.backend.application.service.email.TransactionalEmailService;
import com.megna.backend.domain.entity.ContactRequest;
import com.megna.backend.domain.enums.ContactRequestCategory;
import com.megna.backend.domain.enums.ContactRequestStatus;
import com.megna.backend.domain.enums.EmailStatus;
import com.megna.backend.domain.repository.ContactRequestRepository;
import com.megna.backend.infrastructure.config.ContactProperties;
import com.megna.backend.interfaces.rest.dto.contact.ContactRequestCreateRequestDto;
import com.megna.backend.interfaces.rest.dto.contact.ContactRequestReplyRequestDto;
import com.megna.backend.interfaces.rest.dto.contact.ContactRequestResponseDto;
import com.megna.backend.interfaces.rest.dto.contact.ContactRequestStatusUpdateRequestDto;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class ContactRequestServiceTest {

    @Mock
    private ContactRequestRepository contactRequestRepository;

    @Mock
    private TransactionalEmailService transactionalEmailService;

    @Mock
    private ContactProperties contactProperties;

    @InjectMocks
    private ContactRequestService contactRequestService;

    @Test
    void createSendsOnlyAdminNotificationWhenDeliverySucceeds() {
        when(contactProperties.getGeneralInbox()).thenReturn("contact@megna-realestate.com");
        when(transactionalEmailService.sendTransactional(any())).thenReturn(true);

        List<String> persistedStatuses = new ArrayList<>();
        when(contactRequestRepository.save(any(ContactRequest.class))).thenAnswer(invocation -> {
            ContactRequest contactRequest = invocation.getArgument(0);
            persistedStatuses.add(contactRequest.getAdminEmailStatus() + "/" + contactRequest.getConfirmationEmailStatus());
            if (contactRequest.getId() == null) {
                contactRequest.setId(301L);
            }
            return contactRequest;
        });

        ContactRequestResponseDto response = contactRequestService.create(sampleCreateRequest());

        assertEquals(ContactRequestStatus.NEW, response.status());
        assertEquals(EmailStatus.SENT, response.adminEmailStatus());
        assertNull(response.confirmationEmailStatus());
        assertEquals(List.of("FAILED/null", "SENT/null"), persistedStatuses);

        ArgumentCaptor<TransactionalEmailRequest> emailCaptor = ArgumentCaptor.forClass(TransactionalEmailRequest.class);
        verify(transactionalEmailService).sendTransactional(emailCaptor.capture());
        List<TransactionalEmailRequest> requests = emailCaptor.getAllValues();
        assertEquals(1, requests.size());
        TransactionalEmailRequest emailRequest = requests.getFirst();
        assertEquals("contact@megna-realestate.com", emailRequest.to());
        assertEquals("admin-contact-request-created-cid-v1", emailRequest.templateAlias());

        @SuppressWarnings("unchecked")
        Map<String, Object> model = (Map<String, Object>) emailRequest.templateModel();
        assertEquals("New contact request", model.get("subject"));
        assertEquals("A new contact request was submitted", model.get("title"));
        assertEquals("General support", model.get("category"));
        assertEquals("Alex Johnson", model.get("contact_name"));
        assertEquals("alex@example.com", model.get("contact_email"));
        assertEquals("Need help with account access.", model.get("contact_message"));
        assertEquals("Open Contact Requests", model.get("action_text"));
        assertEquals("https://megna-realestate.com/admin/contact-requests", model.get("action_url"));
        assertTrue(model.get("created_at").toString().endsWith("CT"));
    }

    @Test
    void createKeepsFailedAdminEmailStatusWhenDeliveryFails() {
        when(contactProperties.getGeneralInbox()).thenReturn("contact@megna-realestate.com");
        when(transactionalEmailService.sendTransactional(any())).thenReturn(false);
        when(contactRequestRepository.save(any(ContactRequest.class))).thenAnswer(invocation -> {
            ContactRequest contactRequest = invocation.getArgument(0);
            if (contactRequest.getId() == null) {
                contactRequest.setId(401L);
            }
            return contactRequest;
        });

        ContactRequestResponseDto response = contactRequestService.create(sampleCreateRequest());

        assertEquals(EmailStatus.FAILED, response.adminEmailStatus());
        assertNull(response.confirmationEmailStatus());
        verify(contactRequestRepository, times(1)).save(any(ContactRequest.class));
        verify(transactionalEmailService).sendTransactional(any());
    }

    @Test
    void searchDelegatesToRepositoryWithNormalizedQuery() {
        Pageable pageable = Pageable.unpaged();
        when(contactRequestRepository.search(ContactRequestCategory.GENERAL_SUPPORT, ContactRequestStatus.NEW, "alex", pageable))
                .thenReturn(Page.empty(pageable));

        contactRequestService.search(ContactRequestCategory.GENERAL_SUPPORT, ContactRequestStatus.NEW, "  alex  ", pageable);

        verify(contactRequestRepository).search(ContactRequestCategory.GENERAL_SUPPORT, ContactRequestStatus.NEW, "alex", pageable);
    }

    @Test
    void updateStatusPersistsNewStatus() {
        ContactRequest contactRequest = new ContactRequest();
        contactRequest.setId(999L);
        contactRequest.setStatus(ContactRequestStatus.NEW);

        when(contactRequestRepository.findById(999L)).thenReturn(Optional.of(contactRequest));
        when(contactRequestRepository.save(any(ContactRequest.class))).thenAnswer(invocation -> invocation.getArgument(0));

        ContactRequestResponseDto response = contactRequestService.updateStatus(
                999L,
                new ContactRequestStatusUpdateRequestDto(ContactRequestStatus.CLOSED)
        );

        assertEquals(ContactRequestStatus.CLOSED, response.status());
        verify(contactRequestRepository).save(contactRequest);
    }

    @Test
    void replySendsEmailAndMarksRequestAsReplied() {
        ContactRequest contactRequest = new ContactRequest();
        contactRequest.setId(998L);
        contactRequest.setName("Alex Johnson");
        contactRequest.setEmail("alex@example.com");
        contactRequest.setStatus(ContactRequestStatus.NEW);

        when(contactRequestRepository.findById(998L)).thenReturn(Optional.of(contactRequest));
        when(contactRequestRepository.save(any(ContactRequest.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(transactionalEmailService.sendTransactional(any(TransactionalEmailRequest.class))).thenReturn(true);

        ContactRequestResponseDto response = contactRequestService.reply(
                998L,
                new ContactRequestReplyRequestDto("Thanks, we will follow up today.")
        );

        assertEquals(ContactRequestStatus.REPLIED, response.status());
        assertEquals(EmailStatus.SENT, response.confirmationEmailStatus());
        verify(contactRequestRepository).save(contactRequest);
        verify(transactionalEmailService).sendTransactional(any(TransactionalEmailRequest.class));
    }

    private ContactRequestCreateRequestDto sampleCreateRequest() {
        return new ContactRequestCreateRequestDto(
                ContactRequestCategory.GENERAL_SUPPORT,
                "Alex Johnson",
                "alex@example.com",
                "Need help with account access."
        );
    }
}

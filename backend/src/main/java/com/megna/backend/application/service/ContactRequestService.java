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
import com.megna.backend.interfaces.rest.mapper.ContactRequestMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDateTime;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.LinkedHashMap;
import java.util.Locale;
import java.util.Map;

@Service
@RequiredArgsConstructor
@Slf4j
public class ContactRequestService {
    private static final String ADMIN_TEMPLATE_ALIAS = "admin-contact-request-created-cid-v1";
    private static final String CONTACT_REPLY_TEMPLATE_ALIAS = "contact-request-reply-cid-v1";
    private static final String REPLY_SUBJECT_PREFIX = "Reply from Megna Real Estate";
    private static final String PUBLIC_LOGO_URL = "https://raw.githubusercontent.com/TolibovZafarali/mv-deal-portal/dev/frontend/public/white-logo.png";
    private static final String ACTION_URL = "https://megna-realestate.com/admin/contact-requests";
    private static final String CONTACT_PAGE_URL = "https://megna-realestate.com/contact";
    private static final DateTimeFormatter CREATED_AT_FORMATTER =
            DateTimeFormatter.ofPattern("yyyy-MM-dd h:mm a 'CT'");

    private final ContactRequestRepository contactRequestRepository;
    private final TransactionalEmailService transactionalEmailService;
    private final ContactProperties contactProperties;

    @Transactional
    public ContactRequestResponseDto create(ContactRequestCreateRequestDto dto) {
        ContactRequest contactRequest = ContactRequestMapper.toEntity(dto);
        contactRequest.setName(normalizeRequired(dto.name()));
        contactRequest.setEmail(normalizeEmail(dto.email()));
        contactRequest.setMessageBody(normalizeRequired(dto.message()));
        contactRequest.setStatus(ContactRequestStatus.NEW);
        contactRequest.setAdminEmailStatus(EmailStatus.FAILED);
        contactRequest.setConfirmationEmailStatus(null);
        contactRequest.setCreatedAt(LocalDateTime.now());

        ContactRequest saved = contactRequestRepository.save(contactRequest);

        boolean adminSent = sendAdminNotification(saved);
        if (adminSent) {
            saved.setAdminEmailStatus(EmailStatus.SENT);
        }
        if (adminSent) {
            saved = contactRequestRepository.save(saved);
        }

        return ContactRequestMapper.toDto(saved);
    }

    public Page<ContactRequestResponseDto> search(ContactRequestCategory category,
                                                  ContactRequestStatus status,
                                                  String q,
                                                  Pageable pageable) {
        String normalizedQuery = normalizeQuery(q);
        return contactRequestRepository.search(category, status, normalizedQuery, pageable)
                .map(ContactRequestMapper::toDto);
    }

    @Transactional
    public ContactRequestResponseDto updateStatus(Long id, ContactRequestStatusUpdateRequestDto dto) {
        ContactRequest contactRequest = contactRequestRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Contact request not found: " + id));

        contactRequest.setStatus(dto.status());
        ContactRequest saved = contactRequestRepository.save(contactRequest);
        return ContactRequestMapper.toDto(saved);
    }

    @Transactional
    public ContactRequestResponseDto reply(Long id, ContactRequestReplyRequestDto dto) {
        ContactRequest contactRequest = contactRequestRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Contact request not found: " + id));

        String message = normalizeRequired(dto == null ? null : dto.message());
        boolean delivered = sendContactReply(contactRequest, message);

        contactRequest.setConfirmationEmailStatus(delivered ? EmailStatus.SENT : EmailStatus.FAILED);
        contactRequest.setStatus(ContactRequestStatus.REPLIED);

        ContactRequest saved = contactRequestRepository.save(contactRequest);
        return ContactRequestMapper.toDto(saved);
    }

    private boolean sendAdminNotification(ContactRequest contactRequest) {
        String recipient = resolveAdminInbox(contactRequest.getCategory());
        if (recipient.isBlank()) {
            return false;
        }

        try {
            return transactionalEmailService.sendTransactional(
                    TransactionalEmailRequest.template(
                            recipient,
                            ADMIN_TEMPLATE_ALIAS,
                            buildAdminTemplateModel(contactRequest)
                    )
            );
        } catch (RuntimeException ex) {
            log.warn("Contact request admin email failed unexpectedly: {}", ex.getClass().getSimpleName());
            return false;
        }
    }

    private boolean sendContactReply(ContactRequest contactRequest, String replyMessage) {
        String recipient = normalizeOptional(contactRequest == null ? null : contactRequest.getEmail());
        if (recipient.isBlank()) {
            return false;
        }

        try {
            return transactionalEmailService.sendTransactional(
                    TransactionalEmailRequest.template(
                            recipient,
                            CONTACT_REPLY_TEMPLATE_ALIAS,
                            buildReplyTemplateModel(contactRequest, replyMessage)
                    )
            );
        } catch (RuntimeException ex) {
            log.warn("Contact request reply email failed unexpectedly: {}", ex.getClass().getSimpleName());
            return false;
        }
    }

    private String resolveAdminInbox(ContactRequestCategory category) {
        if (category == null) {
            return normalizeOptional(contactProperties.getGeneralInbox());
        }

        return switch (category) {
            case INVESTOR_QUESTION -> normalizeOptional(contactProperties.getInvestorInbox());
            case SELL_PROPERTY -> normalizeOptional(contactProperties.getSellerInbox());
            case PRIVACY_LEGAL -> normalizeOptional(contactProperties.getPrivacyInbox());
            case GENERAL_SUPPORT -> normalizeOptional(contactProperties.getGeneralInbox());
        };
    }

    private Map<String, Object> buildAdminTemplateModel(ContactRequest contactRequest) {
        Map<String, Object> model = new LinkedHashMap<>();
        model.put("logo_url", PUBLIC_LOGO_URL);
        model.put("subject", "New contact request");
        model.put("title", "A new contact request was submitted");
        model.put("message", "A new contact request has been submitted and needs admin attention.");
        model.put("request_id", safeValue(contactRequest == null ? null : contactRequest.getId()));
        model.put("category", formatCategory(contactRequest == null ? null : contactRequest.getCategory()));
        model.put("contact_name", safeValue(contactRequest == null ? null : contactRequest.getName()));
        model.put("contact_email", safeValue(contactRequest == null ? null : contactRequest.getEmail()));
        model.put("created_at", formatCreatedAt(contactRequest == null ? null : contactRequest.getCreatedAt()));
        model.put("contact_message", safeValue(contactRequest == null ? null : contactRequest.getMessageBody()));
        model.put("action_text", "Open Contact Requests");
        model.put("action_url", ACTION_URL);
        model.put("footer_text", "This notification was sent to admins because a new contact request was submitted.");
        return model;
    }

    private Map<String, Object> buildReplyTemplateModel(ContactRequest contactRequest, String replyMessage) {
        Map<String, Object> model = new LinkedHashMap<>();
        model.put("logo_url", PUBLIC_LOGO_URL);
        model.put("subject", REPLY_SUBJECT_PREFIX + " - Request #" + safeValue(contactRequest == null ? null : contactRequest.getId()));
        model.put("title", "Megna Team replied to your contact request");
        model.put("message", "Thanks for reaching out to Megna Real Estate. We sent a response to your request.");
        model.put("contact_name", safeValue(contactRequest == null ? null : contactRequest.getName()));
        model.put("request_id", safeValue(contactRequest == null ? null : contactRequest.getId()));
        model.put("reply_message", safeValue(replyMessage));
        model.put("action_text", "Contact Us");
        model.put("action_url", CONTACT_PAGE_URL);
        model.put("footer_text", "If you need anything else, reply to this email and our team will help.");
        return model;
    }

    private String formatCategory(ContactRequestCategory category) {
        if (category == null) return "General support";

        return switch (category) {
            case GENERAL_SUPPORT -> "General support";
            case INVESTOR_QUESTION -> "Investor question";
            case SELL_PROPERTY -> "Sell a property";
            case PRIVACY_LEGAL -> "Privacy or legal";
        };
    }

    private String formatCreatedAt(LocalDateTime createdAt) {
        LocalDateTime value = createdAt == null ? LocalDateTime.now() : createdAt;
        return value.atZone(ZoneId.of("America/Chicago")).format(CREATED_AT_FORMATTER);
    }

    private String normalizeQuery(String value) {
        String normalized = value == null ? "" : value.trim();
        return normalized.isBlank() ? null : normalized;
    }

    private String normalizeOptional(String value) {
        return value == null ? "" : value.trim();
    }

    private String normalizeRequired(String value) {
        String normalized = value == null ? "" : value.trim();
        if (normalized.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid contact request payload");
        }
        return normalized;
    }

    private String normalizeEmail(String value) {
        return normalizeRequired(value).toLowerCase(Locale.US);
    }

    private String safeValue(Object value) {
        if (value == null) return "N/A";
        String normalized = String.valueOf(value).trim();
        return normalized.isBlank() ? "N/A" : normalized;
    }
}

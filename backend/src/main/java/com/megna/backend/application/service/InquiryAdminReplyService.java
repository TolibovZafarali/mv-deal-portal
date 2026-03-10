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
import com.megna.backend.infrastructure.security.SecurityUtils;
import com.megna.backend.interfaces.rest.dto.admin.AdminInquiryReplyCreateRequestDto;
import com.megna.backend.interfaces.rest.dto.inquiry.InquiryAdminReplyResponseDto;
import com.megna.backend.interfaces.rest.mapper.InquiryAdminReplyMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDateTime;
import java.util.LinkedHashMap;
import java.util.Map;

@Service
@RequiredArgsConstructor
@Slf4j
public class InquiryAdminReplyService {
    private static final String TEMPLATE_ALIAS = "investor-inquiry-admin-reply-cid-v1";
    private static final String PUBLIC_LOGO_URL = "https://raw.githubusercontent.com/TolibovZafarali/mv-deal-portal/dev/frontend/public/white-logo.png";
    private static final String INVESTOR_PROPERTIES_URL = "https://megna-realestate.com/investor";


    private final InquiryAdminReplyRepository inquiryAdminReplyRepository;
    private final InquiryRepository inquiryRepository;
    private final InvestorRepository investorRepository;
    private final PropertyRepository propertyRepository;
    private final AdminRepository adminRepository;
    private final TransactionalEmailService transactionalEmailService;

    public Page<InquiryAdminReplyResponseDto> getAll(Pageable pageable) {
        requireAdmin();
        return inquiryAdminReplyRepository.findAll(pageable)
                .map(InquiryAdminReplyMapper::toDto);
    }

    public Page<InquiryAdminReplyResponseDto> getByInvestorId(Long investorId, Pageable pageable) {
        requireSelf(investorId);

        if (isAdmin()) {
            return inquiryAdminReplyRepository.findByInvestorId(investorId, pageable)
                    .map(InquiryAdminReplyMapper::toDto);
        }

        return inquiryAdminReplyRepository.findByInvestorIdAndPropertyStatus(investorId, PropertyStatus.ACTIVE, pageable)
                .map(InquiryAdminReplyMapper::toDto);
    }

    @Transactional
    public InquiryAdminReplyResponseDto create(AdminInquiryReplyCreateRequestDto dto) {
        Admin admin = requireAdminEntity();

        Long investorId = dto.investorId();
        Long propertyId = dto.propertyId();
        String body = normalizeBody(dto.body());

        Investor investor = investorRepository.findById(investorId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Investor not found: " + investorId));
        Property property = propertyRepository.findById(propertyId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Property not found: " + propertyId));

        Inquiry latestInquiry = inquiryRepository
                .findTopByInvestorIdAndPropertyIdOrderByCreatedAtDescIdDesc(investorId, propertyId)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND,
                        "No inquiry thread found for investor " + investorId + " and property " + propertyId
                ));

        String recipient = normalizeRecipient(latestInquiry.getContactEmail(), investorId, propertyId);

        InquiryAdminReply reply = new InquiryAdminReply();
        reply.setInvestor(investor);
        reply.setProperty(property);
        reply.setAdmin(admin);
        reply.setMessageBody(body);
        reply.setEmailStatus(EmailStatus.FAILED);
        reply.setCreatedAt(LocalDateTime.now());

        InquiryAdminReply saved = inquiryAdminReplyRepository.save(reply);

        boolean sent = sendReplyEmail(recipient, saved, latestInquiry);
        if (sent) {
            saved.setEmailStatus(EmailStatus.SENT);
            saved = inquiryAdminReplyRepository.save(saved);
        }

        return InquiryAdminReplyMapper.toDto(saved);
    }

    private boolean sendReplyEmail(String recipient, InquiryAdminReply reply, Inquiry inquiry) {
        try {
            return transactionalEmailService.sendTransactional(
                    TransactionalEmailRequest.template(
                            recipient,
                            TEMPLATE_ALIAS,
                            buildReplyTemplateModel(reply, inquiry)
                    )
            );
        } catch (RuntimeException ex) {
            log.warn("Inquiry admin reply email failed unexpectedly: {}", ex.getClass().getSimpleName());
            return false;
        }
    }

    private Map<String, Object> buildReplyTemplateModel(InquiryAdminReply reply, Inquiry inquiry) {
        String investorName = resolveInvestorName(reply, inquiry);
        Map<String, Object> model = new LinkedHashMap<>();
        model.put("logo_url", PUBLIC_LOGO_URL);
        model.put("subject", "Megna Team replied to your inquiry");
        model.put("title", "You have a new inquiry reply, " + investorName);
        model.put("message", "Megna Team has posted a reply to your inquiry, " + investorName + ".");
        model.put("investor_name", investorName);
        model.put("reply_id", safeNumber(reply == null ? null : reply.getId()));
        model.put("property_id", safeNumber(reply == null || reply.getProperty() == null ? null : reply.getProperty().getId()));
        model.put("investor_id", safeNumber(reply == null || reply.getInvestor() == null ? null : reply.getInvestor().getId()));
        model.put("reply_message", safeValue(reply == null ? null : reply.getMessageBody()));
        model.put("original_inquiry_message", safeValue(inquiry == null ? null : inquiry.getMessageBody()));
        model.put("action_text", "View Properties");
        model.put("action_url", resolveActionUrl(reply));
        model.put("footer_text", "Reply to this email if you need additional support from the Megna Team.");
        return model;
    }

    private String resolveInvestorName(InquiryAdminReply reply, Inquiry inquiry) {
        if (inquiry != null && inquiry.getContactName() != null) {
            String contactName = inquiry.getContactName().trim();
            if (!contactName.isBlank()) {
                return contactName;
            }
        }

        if (reply != null && reply.getInvestor() != null) {
            Investor investor = reply.getInvestor();
            String firstName = investor.getFirstName() == null ? "" : investor.getFirstName().trim();
            if (!firstName.isBlank()) {
                return firstName;
            }
        }

        return "there";
    }

    private String resolveActionUrl(InquiryAdminReply reply) {
        return INVESTOR_PROPERTIES_URL;
    }

    private String safeNumber(Number value) {
        return value == null ? "N/A" : String.valueOf(value);
    }

    private String safeValue(String value) {
        if (value == null) {
            return "N/A";
        }
        String normalized = value.trim();
        return normalized.isBlank() ? "N/A" : normalized;
    }

    private String normalizeBody(String body) {
        String normalized = body == null ? "" : body.trim();
        if (normalized.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "body is required");
        }
        return normalized;
    }

    private String normalizeRecipient(String email, Long investorId, Long propertyId) {
        String recipient = email == null ? "" : email.trim();
        if (recipient.isBlank()) {
            throw new ResponseStatusException(
                    HttpStatus.CONFLICT,
                    "Inquiry thread has no contact email for investor " + investorId + " and property " + propertyId
            );
        }
        return recipient;
    }

    private boolean isAdmin() {
        return "ADMIN".equalsIgnoreCase(principal().role());
    }

    private void requireSelf(Long investorId) {
        if (investorId == null) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Forbidden");
        }
        if (!isAdmin() && principal().userId() != investorId) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Forbidden");
        }
    }

    private void requireAdmin() {
        if (!isAdmin()) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Forbidden");
        }
    }

    private Admin requireAdminEntity() {
        requireAdmin();
        AuthPrincipal principal = principal();
        return adminRepository.findById(principal.userId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.FORBIDDEN, "Forbidden"));
    }

    private AuthPrincipal principal() {
        return SecurityUtils.requirePrincipal();
    }
}

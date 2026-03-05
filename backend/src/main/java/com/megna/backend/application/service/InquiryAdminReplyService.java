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

@Service
@RequiredArgsConstructor
@Slf4j
public class InquiryAdminReplyService {

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
                    new TransactionalEmailRequest(
                            recipient,
                            buildReplySubject(reply),
                            buildReplyBody(reply, inquiry)
                    )
            );
        } catch (RuntimeException ex) {
            log.warn("Inquiry admin reply email failed unexpectedly: {}", ex.getClass().getSimpleName());
            return false;
        }
    }

    private String buildReplySubject(InquiryAdminReply reply) {
        return "Megna Team reply to your inquiry #" + (reply.getId() == null ? "N/A" : reply.getId());
    }

    private String buildReplyBody(InquiryAdminReply reply, Inquiry inquiry) {
        StringBuilder body = new StringBuilder();
        body.append("Megna Team has replied to your inquiry.\n\n");
        body.append("Property ID: ").append(reply.getProperty() == null ? "N/A" : reply.getProperty().getId()).append("\n");
        body.append("Investor ID: ").append(reply.getInvestor() == null ? "N/A" : reply.getInvestor().getId()).append("\n\n");
        body.append("Reply:\n");
        body.append(reply.getMessageBody()).append("\n\n");
        body.append("Original inquiry message:\n");
        body.append(inquiry.getMessageBody() == null ? "N/A" : inquiry.getMessageBody());
        return body.toString();
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

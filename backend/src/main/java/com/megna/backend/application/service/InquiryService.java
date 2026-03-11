package com.megna.backend.application.service;

import com.megna.backend.application.service.email.TransactionalEmailRequest;
import com.megna.backend.application.service.email.TransactionalEmailService;
import com.megna.backend.interfaces.rest.dto.inquiry.InquiryCreateRequestDto;
import com.megna.backend.interfaces.rest.dto.inquiry.InquiryResponseDto;
import com.megna.backend.domain.entity.Inquiry;
import com.megna.backend.domain.entity.InquiryAdminReply;
import com.megna.backend.domain.entity.Investor;
import com.megna.backend.domain.entity.Property;
import com.megna.backend.domain.enums.EmailStatus;
import com.megna.backend.domain.enums.InvestorStatus;
import com.megna.backend.domain.enums.PropertyStatus;
import com.megna.backend.interfaces.rest.mapper.InquiryMapper;
import com.megna.backend.domain.repository.InquiryRepository;
import com.megna.backend.domain.repository.InquiryAdminReplyRepository;
import com.megna.backend.domain.repository.InvestorRepository;
import com.megna.backend.domain.repository.PropertyRepository;
import com.megna.backend.infrastructure.security.AuthPrincipal;
import com.megna.backend.infrastructure.security.SecurityUtils;
import lombok.extern.slf4j.Slf4j;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDateTime;
import java.time.ZoneId;
import java.time.ZoneOffset;
import java.time.format.DateTimeFormatter;
import java.util.LinkedHashMap;
import java.util.Map;

@Service
@RequiredArgsConstructor
@Slf4j
public class InquiryService {

    private static final String MEGNA_TEAM_INBOX = "contact@megna.us";
    private static final String INQUIRY_CREATED_TEMPLATE_ALIAS = "admin-inquiry-created-cid-v1";
    private static final String INQUIRY_FOLLOW_UP_TEMPLATE_ALIAS = "admin-inquiry-follow-up-cid-v1";
    private static final String PUBLIC_LOGO_URL = "https://raw.githubusercontent.com/TolibovZafarali/mv-deal-portal/dev/frontend/public/white-logo.png";
    private static final DateTimeFormatter CREATED_AT_FORMATTER =
            DateTimeFormatter.ofPattern("yyyy-MM-dd hh:mm a z");

    private final InquiryRepository inquiryRepository;
    private final InquiryAdminReplyRepository inquiryAdminReplyRepository;
    private final PropertyRepository propertyRepository;
    private final InvestorRepository investorRepository;
    private final TransactionalEmailService transactionalEmailService;

    public InquiryResponseDto create(InquiryCreateRequestDto dto) {
        requireSelf(dto.investorId());
        requireApprovedInvestor(dto.investorId());

        Property property = propertyRepository.findById(dto.propertyId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Property not found: " + dto.propertyId()));

        if (property.getStatus() != PropertyStatus.ACTIVE) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Property not found: " + dto.propertyId());
        }

        Investor investor = investorRepository.findById(dto.investorId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Investor not found: " + dto.investorId()));

        Inquiry latestInquiry = inquiryRepository
                .findTopByInvestorIdAndPropertyIdOrderByCreatedAtDescIdDesc(dto.investorId(), dto.propertyId())
                .orElse(null);
        InquiryAdminReply latestReply = inquiryAdminReplyRepository
                .findTopByInvestorIdAndPropertyIdOrderByCreatedAtDescIdDesc(dto.investorId(), dto.propertyId())
                .orElse(null);

        if (!canSendInquiryMessage(latestInquiry, latestReply)) {
            throw new ResponseStatusException(
                    HttpStatus.CONFLICT,
                    "You can send another message after Megna Team replies to your previous inquiry."
            );
        }

        Inquiry inquiry = InquiryMapper.toEntity(dto, property, investor);
        inquiry.setEmailStatus(EmailStatus.FAILED);
        Inquiry saved = inquiryRepository.save(inquiry);

        boolean sent = sendInquiryNotification(saved, latestInquiry, latestReply);
        if (sent) {
            saved.setEmailStatus(EmailStatus.SENT);
            saved = inquiryRepository.save(saved);
        }

        return InquiryMapper.toDto(saved);
    }

    public InquiryResponseDto getById(Long id) {
        Inquiry inquiry = inquiryRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Inquiry not found: " + id));

        requireSelf(inquiry.getInvestor().getId());
        if (!isAdmin() && !isInquiryVisibleToInvestor(inquiry)) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Inquiry not found: " + id);
        }

        return InquiryMapper.toDto(inquiry);
    }

    public Page<InquiryResponseDto> getAll(Pageable pageable) {
        requireAdmin();
        return inquiryRepository.findAll(pageable)
                .map(InquiryMapper::toDto);
    }

    public void delete(Long id) {
        Inquiry inquiry = inquiryRepository.findById(id)
                        .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Inquiry not found: " + id));

        requireSelf(inquiry.getInvestor().getId());

        inquiryRepository.deleteById(id);
    }

    public Page<InquiryResponseDto> getByPropertyId(Long propertyId, Pageable pageable) {
        requireAdmin();
        return inquiryRepository.findByPropertyId(propertyId, pageable)
                .map(InquiryMapper::toDto);
    }

    public Page<InquiryResponseDto> getByInvestorId(Long investorId, Pageable pageable) {
        requireSelf(investorId);
        if (isAdmin()) {
            return inquiryRepository.findByInvestorId(investorId, pageable)
                    .map(InquiryMapper::toDto);
        }

        return inquiryRepository.findByInvestorIdAndPropertyStatus(investorId, PropertyStatus.ACTIVE, pageable)
                .map(InquiryMapper::toDto);
    }

    public Page<InquiryResponseDto> getBySellerId(Long sellerId, Pageable pageable) {
        requireSellerSelfOrAdmin(sellerId);
        return inquiryRepository.findByPropertySellerId(sellerId, pageable)
                .map(InquiryMapper::toDto);
    }

    private AuthPrincipal principal() {
        return SecurityUtils.requirePrincipal();
    }

    private boolean isAdmin() {
        return "ADMIN".equalsIgnoreCase(principal().role());
    }

    private void requireAdmin() {
        if (!isAdmin()) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Forbidden");
        }
    }

    private void requireSelf(Long investorId) {
        if (investorId == null) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Forbidden");
        }
        if (!isAdmin() && principal().userId() != investorId) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Forbidden");
        }
    }

    private void requireApprovedInvestor(Long investorId) {
        Investor investor = investorRepository.findById(investorId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Investor not found: " + investorId));

        if (investor.getStatus() != InvestorStatus.APPROVED) {
            throw new ResponseStatusException(
                    HttpStatus.FORBIDDEN,
                    "Access denied: investor status is " + investor.getStatus().name()
            );
        }
    }

    private boolean canSendInquiryMessage(Inquiry latestInquiry, InquiryAdminReply latestReply) {
        if (latestInquiry == null) {
            return true;
        }

        if (latestReply == null) {
            return false;
        }

        LocalDateTime inquiryCreatedAt = latestInquiry.getCreatedAt();
        LocalDateTime replyCreatedAt = latestReply.getCreatedAt();
        if (inquiryCreatedAt == null || replyCreatedAt == null) {
            return false;
        }

        return !replyCreatedAt.isBefore(inquiryCreatedAt);
    }

    private void requireSellerSelfOrAdmin(Long sellerId) {
        if (sellerId == null || sellerId <= 0) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Forbidden");
        }

        if (isAdmin()) return;

        AuthPrincipal principal = principal();
        if (!"SELLER".equalsIgnoreCase(principal.role()) || principal.userId() != sellerId) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Forbidden");
        }
    }

    private boolean sendInquiryNotification(Inquiry inquiry, Inquiry latestInquiry, InquiryAdminReply latestReply) {
        boolean isFollowUp = latestInquiry != null;
        String templateAlias = isFollowUp
                ? INQUIRY_FOLLOW_UP_TEMPLATE_ALIAS
                : INQUIRY_CREATED_TEMPLATE_ALIAS;
        Map<String, Object> templateModel = isFollowUp
                ? buildFollowUpTemplateModel(inquiry, latestInquiry, latestReply)
                : buildInquiryCreatedTemplateModel(inquiry);
        try {
            return transactionalEmailService.sendTransactional(
                    TransactionalEmailRequest.template(
                            MEGNA_TEAM_INBOX,
                            templateAlias,
                            templateModel
                    )
            );
        } catch (RuntimeException ex) {
            log.warn("Inquiry notification email failed unexpectedly: {}", ex.getClass().getSimpleName());
            return false;
        }
    }

    private Map<String, Object> buildInquiryCreatedTemplateModel(Inquiry inquiry) {
        Map<String, Object> model = new LinkedHashMap<>();
        model.put("logo_url", PUBLIC_LOGO_URL);
        model.put("subject", "New investor inquiry");
        model.put("title", "A new investor inquiry was created");
        model.put("message", "A new inquiry has been submitted and needs admin attention.");
        model.put("inquiry_id", safeNumber(inquiry == null ? null : inquiry.getId()));
        model.put("investor_name", safeValue(inquiry == null ? null : inquiry.getContactName()));
        model.put("investor_email", safeValue(inquiry == null ? null : inquiry.getContactEmail()));
        model.put("property_address", resolvePropertyAddress(inquiry));
        model.put("created_at", formatCreatedAt(inquiry));
        model.put("inquiry_message", safeValue(inquiry == null ? null : inquiry.getMessageBody()));
        model.put("action_text", "Open Inquiry");
        model.put("action_url", "https://megna.us/admin/inquiries?inquiryId=" + safeNumber(inquiry == null ? null : inquiry.getId()));
        model.put("footer_text", "This notification was sent to admins because a new inquiry was created.");
        return model;
    }

    private Map<String, Object> buildFollowUpTemplateModel(Inquiry inquiry, Inquiry latestInquiry, InquiryAdminReply latestReply) {
        Map<String, Object> model = new LinkedHashMap<>();
        model.put("logo_url", PUBLIC_LOGO_URL);
        model.put("subject", "Investor follow-up on inquiry");
        model.put("title", "An investor sent a follow-up message");
        model.put("message", "There is a new follow-up in an existing inquiry thread.");
        model.put("inquiry_id", safeNumber(inquiry == null ? null : inquiry.getId()));
        model.put("thread_id", resolveThreadId(inquiry, latestInquiry));
        model.put("investor_name", safeValue(inquiry == null ? null : inquiry.getContactName()));
        model.put("investor_email", safeValue(inquiry == null ? null : inquiry.getContactEmail()));
        model.put("property_address", resolvePropertyAddress(inquiry));
        model.put("last_message_at", formatCreatedAt(latestReply == null ? null : latestReply.getCreatedAt()));
        model.put("previous_message_excerpt", excerpt(safeValue(latestReply == null ? null : latestReply.getMessageBody())));
        model.put("follow_up_message", safeValue(inquiry == null ? null : inquiry.getMessageBody()));
        model.put("action_text", "Open Inquiry Thread");
        model.put("action_url", "https://megna.us/admin/inquiries?inquiryId=" + safeNumber(inquiry == null ? null : inquiry.getId()));
        model.put("footer_text", "This notification was sent to admins because an investor followed up on an inquiry.");
        return model;
    }

    private String resolvePropertyAddress(Inquiry inquiry) {
        if (inquiry == null || inquiry.getProperty() == null) {
            return "N/A";
        }
        Property property = inquiry.getProperty();
        String line1 = joinComma(property.getStreet1(), property.getStreet2());
        String stateZip = joinSpace(property.getState(), property.getZip());
        String line2 = joinComma(property.getCity(), stateZip);
        String address = joinComma(line1, line2);
        return address.isBlank() ? "N/A" : address;
    }

    private String formatCreatedAt(Inquiry inquiry) {
        if (inquiry == null) {
            return formatCreatedAt((LocalDateTime) null);
        }
        return formatCreatedAt(inquiry.getCreatedAt());
    }

    private String formatCreatedAt(LocalDateTime createdAt) {
        LocalDateTime value = createdAt == null ? utcNow() : createdAt;
        return value.atZone(ZoneId.of("America/Chicago")).format(CREATED_AT_FORMATTER);
    }

    private String resolveThreadId(Inquiry inquiry, Inquiry latestInquiry) {
        Long investorId = inquiry != null && inquiry.getInvestor() != null ? inquiry.getInvestor().getId() : null;
        Long propertyId = inquiry != null && inquiry.getProperty() != null ? inquiry.getProperty().getId() : null;
        if (investorId == null || propertyId == null) {
            Long fallbackInvestorId = latestInquiry != null && latestInquiry.getInvestor() != null ? latestInquiry.getInvestor().getId() : null;
            Long fallbackPropertyId = latestInquiry != null && latestInquiry.getProperty() != null ? latestInquiry.getProperty().getId() : null;
            if (fallbackInvestorId == null || fallbackPropertyId == null) {
                return "N/A";
            }
            return fallbackInvestorId + "-" + fallbackPropertyId;
        }
        return investorId + "-" + propertyId;
    }

    private String excerpt(String value) {
        if (value == null || value.isBlank() || "N/A".equals(value)) {
            return "N/A";
        }
        String normalized = value.replaceAll("\\s+", " ").trim();
        int maxLen = 220;
        if (normalized.length() <= maxLen) {
            return normalized;
        }
        return normalized.substring(0, maxLen - 3) + "...";
    }

    private String safeValue(String value) {
        if (value == null || value.isBlank()) {
            return "N/A";
        }
        return value.trim();
    }

    private String safeNumber(Long value) {
        return value == null ? "N/A" : value.toString();
    }

    private static String joinComma(String... values) {
        StringBuilder result = new StringBuilder();
        if (values == null) return "";
        for (String value : values) {
            String normalized = value == null ? "" : value.trim();
            if (normalized.isBlank()) continue;
            if (result.length() > 0) {
                result.append(", ");
            }
            result.append(normalized);
        }
        return result.toString();
    }

    private static String joinSpace(String left, String right) {
        String normalizedLeft = left == null ? "" : left.trim();
        String normalizedRight = right == null ? "" : right.trim();
        if (normalizedLeft.isBlank()) return normalizedRight;
        if (normalizedRight.isBlank()) return normalizedLeft;
        return normalizedLeft + " " + normalizedRight;
    }

    private static LocalDateTime utcNow() {
        return LocalDateTime.now(ZoneOffset.UTC);
    }

    private boolean isInquiryVisibleToInvestor(Inquiry inquiry) {
        if (inquiry == null || inquiry.getProperty() == null) {
            return false;
        }
        return inquiry.getProperty().getStatus() == PropertyStatus.ACTIVE;
    }
}

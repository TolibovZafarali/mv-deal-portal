package com.megna.backend.application.service;

import com.megna.backend.application.service.email.TransactionalEmailRequest;
import com.megna.backend.application.service.email.TransactionalEmailService;
import com.megna.backend.interfaces.rest.dto.inquiry.InquiryCreateRequestDto;
import com.megna.backend.interfaces.rest.dto.inquiry.InquiryResponseDto;
import com.megna.backend.domain.entity.Inquiry;
import com.megna.backend.domain.entity.Investor;
import com.megna.backend.domain.entity.Property;
import com.megna.backend.domain.enums.EmailStatus;
import com.megna.backend.domain.enums.InvestorStatus;
import com.megna.backend.domain.enums.PropertyStatus;
import com.megna.backend.interfaces.rest.mapper.InquiryMapper;
import com.megna.backend.domain.repository.InquiryRepository;
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

import java.util.ArrayList;
import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
public class InquiryService {

    private static final String MEGNA_TEAM_INBOX = "contact@megna-realestate.com";

    private final InquiryRepository inquiryRepository;
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

        Inquiry inquiry = InquiryMapper.toEntity(dto, property, investor);
        inquiry.setEmailStatus(EmailStatus.FAILED);
        Inquiry saved = inquiryRepository.save(inquiry);

        boolean sent = sendInquiryNotification(saved);
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
        return Page.empty(pageable);
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

    private boolean sendInquiryNotification(Inquiry inquiry) {
        try {
            return transactionalEmailService.sendTransactional(
                    new TransactionalEmailRequest(
                            MEGNA_TEAM_INBOX,
                            buildInquirySubject(inquiry),
                            buildInquiryBody(inquiry)
                    )
            );
        } catch (RuntimeException ex) {
            log.warn("Inquiry notification email failed unexpectedly: {}", ex.getClass().getSimpleName());
            return false;
        }
    }

    private String buildInquirySubject(Inquiry inquiry) {
        String subject = inquiry.getSubject() == null ? "" : inquiry.getSubject().trim();
        Long inquiryId = inquiry.getId();
        if (!subject.isBlank()) {
            return "New inquiry #" + (inquiryId == null ? "N/A" : inquiryId) + ": " + subject;
        }
        return "New inquiry #" + (inquiryId == null ? "N/A" : inquiryId);
    }

    private String buildInquiryBody(Inquiry inquiry) {
        List<String> lines = new ArrayList<>();
        lines.add("A new inquiry was submitted.");
        lines.add("");
        lines.add("Inquiry ID: " + safeNumber(inquiry.getId()));
        lines.add("Property ID: " + safeNumber(inquiry.getProperty() == null ? null : inquiry.getProperty().getId()));
        lines.add("Investor ID: " + safeNumber(inquiry.getInvestor() == null ? null : inquiry.getInvestor().getId()));
        lines.add("Subject: " + safeValue(inquiry.getSubject()));
        lines.add("Message: " + safeValue(inquiry.getMessageBody()));
        lines.add("");
        lines.add("Contact Name: " + safeValue(inquiry.getContactName()));
        lines.add("Company: " + safeValue(inquiry.getCompanyName()));
        lines.add("Contact Email: " + safeValue(inquiry.getContactEmail()));
        lines.add("Contact Phone: " + safeValue(inquiry.getContactPhone()));
        return String.join("\n", lines);
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

    private boolean isInquiryVisibleToInvestor(Inquiry inquiry) {
        if (inquiry == null || inquiry.getProperty() == null) {
            return false;
        }
        return inquiry.getProperty().getStatus() == PropertyStatus.ACTIVE;
    }
}

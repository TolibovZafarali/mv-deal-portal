package com.megna.backend.application.service;

import com.megna.backend.application.service.email.TransactionalEmailRequest;
import com.megna.backend.application.service.email.TransactionalEmailService;
import com.megna.backend.interfaces.rest.dto.investor.InvestorRejectionRequestDto;
import com.megna.backend.interfaces.rest.dto.investor.InvestorResponseDto;
import com.megna.backend.interfaces.rest.dto.investor.InvestorStatusUpdateRequestDto;
import com.megna.backend.interfaces.rest.dto.investor.InvestorUpdateRequestDto;
import com.megna.backend.domain.entity.Investor;
import com.megna.backend.domain.enums.InvestorStatus;
import com.megna.backend.interfaces.rest.mapper.InvestorMapper;
import com.megna.backend.domain.repository.InvestorRepository;
import com.megna.backend.infrastructure.security.AuthPrincipal;
import com.megna.backend.infrastructure.security.SecurityUtils;
import com.megna.backend.application.specification.InvestorSpecifications;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.util.LinkedHashMap;
import java.util.Locale;
import java.util.Map;
import java.time.LocalDateTime;

@Service
@RequiredArgsConstructor
@Slf4j
public class InvestorService {

    private static final String INVESTOR_WELCOME_TEMPLATE_ALIAS = "welcome-cid-v1";
    private static final String PUBLIC_LOGO_URL = "https://raw.githubusercontent.com/TolibovZafarali/mv-deal-portal/dev/frontend/public/white-logo.png";

    private final InvestorRepository investorRepository;
    private final TransactionalEmailService transactionalEmailService;

    public InvestorResponseDto getById(Long id) {
        requireSelf(id);

        Investor investor = investorRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Investor not found: " + id));

        return InvestorMapper.toDto(investor);
    }

    public Page<InvestorResponseDto> getAll(Pageable pageable) {
        requireAdmin();

        return investorRepository.findAll(pageable)
                .map(InvestorMapper::toDto);
    }

    public InvestorResponseDto update(Long id, InvestorUpdateRequestDto dto) {
        requireSelf(id);

        Investor investor = investorRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Investor not found: " + id));

        InvestorMapper.applyUpdate(dto, investor);

        Investor saved = investorRepository.save(investor);
        return InvestorMapper.toDto(saved);
    }

    public InvestorResponseDto updateStatus(Long id, InvestorStatusUpdateRequestDto dto) {
        requireAdmin();

        if (dto == null || dto.status() == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Status is required");
        }

        Investor investor = investorRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Investor not found: " + id));

        InvestorStatus current = investor.getStatus();
        InvestorStatus requested = dto.status();

        // Idempotent: approving an already-approved investor (or rejecting an already-rejected one) should not change timestamps.
        if (current == requested) {
            return InvestorMapper.toDto(investor);
        }

        // Only allow PENDING -> APPROVED/REJECTED
        if (current != InvestorStatus.PENDING) {
            throw new ResponseStatusException(
                    HttpStatus.CONFLICT,
                    "Cannot change investor status from " + current + " to " + requested
            );
        }

        if (requested == InvestorStatus.PENDING) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Cannot set status back to PENDING");
        }

        if (requested == InvestorStatus.APPROVED) {
            investor.setRejectionReason(null);
        }

        InvestorMapper.applyStatusUpdate(dto, investor);

        Investor saved = investorRepository.save(investor);
        if (requested == InvestorStatus.APPROVED) {
            sendInvestorApprovedWelcomeEmail(saved);
        }
        return InvestorMapper.toDto(saved);
    }

    public InvestorResponseDto reject(Long id, InvestorRejectionRequestDto dto) {
        requireAdmin();

        Investor investor = investorRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Investor not found: " + id));

        if (investor.getStatus() != InvestorStatus.PENDING) {
            throw new ResponseStatusException(
                    HttpStatus.CONFLICT,
                    "Cannot change investor status from " + investor.getStatus() + " to REJECTED"
            );
        }

        String reason = dto.rejectionReason().trim();

        investor.setStatus(InvestorStatus.REJECTED);
        investor.setRejectionReason(reason);
        investor.setApprovedAt(null);

        Investor saved = investorRepository.save(investor);
        return InvestorMapper.toDto(saved);
    }

    public void delete(Long id) {
        requireSelf(id);

        if (!investorRepository.existsById(id)) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Investor not found: " + id);
        }
        investorRepository.deleteById(id);
    }

    public InvestorResponseDto getByEmail(String email) {
        requireSelfEmail(email);

        Investor investor = investorRepository.findByEmail(email)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Investor not found: " + email));

        return InvestorMapper.toDto(investor);
    }

    public Page<InvestorResponseDto> search(
            InvestorStatus status,
            String q,
            LocalDateTime createdFrom,
            LocalDateTime createdTo,
            LocalDateTime updatedFrom,
            LocalDateTime updatedTo,
            LocalDateTime approvedFrom,
            LocalDateTime approvedTo,
            Pageable pageable
    ) {
        requireAdmin();

        var spec = InvestorSpecifications.withFilters(
                status,
                q,
                createdFrom,
                createdTo,
                updatedFrom,
                updatedTo,
                approvedFrom,
                approvedTo
        );

        return investorRepository.findAll(spec, pageable)
                .map(InvestorMapper::toDto);
    }

    public InvestorResponseDto updateRejectionReason(Long id, InvestorRejectionRequestDto dto) {
        requireAdmin();

        Investor investor = investorRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Investor not found: " + id));

        if (investor.getStatus() != InvestorStatus.REJECTED) {
            throw new ResponseStatusException(
                    HttpStatus.CONFLICT,
                    "Can only update rejection reason for REJECTED investors"
            );
        }

        investor.setRejectionReason(dto.rejectionReason().trim());

        Investor saved = investorRepository.save(investor);
        return InvestorMapper.toDto(saved);
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

        if (!isAdmin() && principal().userId() != investorId.longValue()) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Forbidden");
        }
    }

    private void requireSelfEmail(String email) {
        if (email == null || email.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Email is required");
        }

        if (!isAdmin() && !principal().email().equalsIgnoreCase(email)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Forbidden");
        }
    }

    private void sendInvestorApprovedWelcomeEmail(Investor investor) {
        String recipient = resolveRecipientEmail(investor);
        if (recipient.isBlank()) {
            return;
        }

        try {
            boolean sent = transactionalEmailService.sendTransactional(
                    TransactionalEmailRequest.template(
                            recipient,
                            INVESTOR_WELCOME_TEMPLATE_ALIAS,
                            buildInvestorApprovedWelcomeModel(investor)
                    )
            );
            if (!sent) {
                log.warn("Investor approved welcome email was not delivered for investorId={}", investor.getId());
            }
        } catch (RuntimeException ex) {
            log.warn(
                    "Investor approved welcome email send threw runtime exception for investorId={} type={}",
                    investor.getId(),
                    ex.getClass().getSimpleName()
            );
        }
    }

    private static Map<String, Object> buildInvestorApprovedWelcomeModel(Investor investor) {
        String firstName = investor == null || investor.getFirstName() == null
                ? ""
                : investor.getFirstName().trim();
        String greetingName = firstName.isBlank() ? "there" : firstName;

        Map<String, Object> model = new LinkedHashMap<>();
        model.put("logo_url", PUBLIC_LOGO_URL);
        model.put("subject", "Welcome to Megna");
        model.put("title", "Welcome to Megna, " + greetingName);
        model.put("message", "Your investor account has been approved. You can now access listings and submit inquiries.");
        model.put("action_text", "Open Investor Dashboard");
        model.put("action_url", "https://megna-realestate.com/investor/dashboard");
        model.put("footer_text", "Need help? Reply to this email and our team will assist you.");
        return model;
    }

    private static String resolveRecipientEmail(Investor investor) {
        if (investor == null) {
            return "";
        }

        String notificationEmail = normalizeEmail(investor.getNotificationEmail());
        if (!notificationEmail.isBlank()) {
            return notificationEmail;
        }
        return normalizeEmail(investor.getEmail());
    }

    private static String normalizeEmail(String value) {
        if (value == null) {
            return "";
        }
        return value.trim().toLowerCase(Locale.US);
    }
}

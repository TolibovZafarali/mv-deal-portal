package com.megna.backend.application.service;

import com.megna.backend.application.service.email.TransactionalEmailRequest;
import com.megna.backend.application.service.email.TransactionalEmailService;
import com.megna.backend.domain.entity.Investor;
import com.megna.backend.domain.entity.InvestorInvitation;
import com.megna.backend.domain.enums.InvestorInvitationStatus;
import com.megna.backend.domain.enums.InvestorStatus;
import com.megna.backend.domain.repository.AdminRepository;
import com.megna.backend.domain.repository.InvestorInvitationRepository;
import com.megna.backend.domain.repository.InvestorRepository;
import com.megna.backend.domain.repository.SellerRepository;
import com.megna.backend.infrastructure.config.AuthProperties;
import com.megna.backend.infrastructure.config.EmailProperties;
import com.megna.backend.infrastructure.security.AuthPrincipal;
import com.megna.backend.infrastructure.security.SecurityUtils;
import com.megna.backend.interfaces.rest.dto.auth.RegisterResponseDto;
import com.megna.backend.interfaces.rest.dto.invitation.AdminInvestorInvitationBatchRequestDto;
import com.megna.backend.interfaces.rest.dto.invitation.AdminInvestorInvitationBatchResponseDto;
import com.megna.backend.interfaces.rest.dto.invitation.InvestorInvitationAcceptRequestDto;
import com.megna.backend.interfaces.rest.dto.invitation.InvestorInvitationPreviewDto;
import com.megna.backend.interfaces.rest.dto.invitation.InvestorInvitationRequestDto;
import com.megna.backend.interfaces.rest.dto.invitation.InvestorInvitationSendResultDto;
import com.megna.backend.interfaces.rest.dto.invitation.InvestorInvitationSendResultStatus;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Base64;
import java.util.HashSet;
import java.util.HexFormat;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;

@Service
@RequiredArgsConstructor
@Slf4j
public class InvestorInvitationService {

    private static final String INVESTOR_INVITATION_TEMPLATE_ALIAS = "investor-invitation-cid-v1";
    private static final String PUBLIC_LOGO_URL = "https://raw.githubusercontent.com/TolibovZafarali/mv-deal-portal/dev/frontend/public/white-logo.png";
    private static final String MICHAEL_MEGNA_DISPLAY_NAME = "Michael Megna";
    private static final String INVALID_INVITATION_MESSAGE = "Invitation link is invalid or expired.";
    private static final int OPAQUE_TOKEN_BYTE_LENGTH = 32;
    private static final SecureRandom SECURE_RANDOM = new SecureRandom();

    private final InvestorInvitationRepository investorInvitationRepository;
    private final AdminRepository adminRepository;
    private final InvestorRepository investorRepository;
    private final SellerRepository sellerRepository;
    private final TransactionalEmailService transactionalEmailService;
    private final AuthProperties authProperties;
    private final EmailProperties emailProperties;
    private final PasswordEncoder passwordEncoder;

    @Transactional
    public AdminInvestorInvitationBatchResponseDto sendInvitations(AdminInvestorInvitationBatchRequestDto dto) {
        long adminId = requireAdminUserId();
        Set<String> requestEmails = new HashSet<>();
        List<InvestorInvitationSendResultDto> results = new ArrayList<>();

        for (InvestorInvitationRequestDto invitation : dto.invitations()) {
            String firstName = normalizeName(invitation.firstName());
            String lastName = normalizeName(invitation.lastName());
            String email = normalizeEmail(invitation.email());

            if (!requestEmails.add(email)) {
                results.add(new InvestorInvitationSendResultDto(
                        firstName,
                        lastName,
                        email,
                        InvestorInvitationSendResultStatus.SKIPPED_DUPLICATE_IN_REQUEST,
                        "Duplicate email in this batch."
                ));
                continue;
            }

            if (isAccountEmailInUse(email)) {
                results.add(new InvestorInvitationSendResultDto(
                        firstName,
                        lastName,
                        email,
                        InvestorInvitationSendResultStatus.SKIPPED_EXISTING_ACCOUNT,
                        "An account already exists for this email."
                ));
                continue;
            }

            results.add(sendOrResendInvitation(adminId, firstName, lastName, email));
        }

        int sentCount = countResults(results, InvestorInvitationSendResultStatus.SENT);
        int resentCount = countResults(results, InvestorInvitationSendResultStatus.RESENT);
        int skippedExistingAccountCount = countResults(results, InvestorInvitationSendResultStatus.SKIPPED_EXISTING_ACCOUNT);
        int skippedDuplicateCount = countResults(results, InvestorInvitationSendResultStatus.SKIPPED_DUPLICATE_IN_REQUEST);
        int failedCount = countResults(results, InvestorInvitationSendResultStatus.FAILED);

        return new AdminInvestorInvitationBatchResponseDto(
                dto.invitations().size(),
                sentCount,
                resentCount,
                skippedExistingAccountCount,
                skippedDuplicateCount,
                failedCount,
                List.copyOf(results)
        );
    }

    @Transactional
    public InvestorInvitationPreviewDto getInvitationPreview(String rawToken) {
        InvestorInvitation invitation = requirePendingInvitation(rawToken);
        return new InvestorInvitationPreviewDto(
                invitation.getFirstName(),
                invitation.getLastName(),
                invitation.getEmail(),
                invitation.getExpiresAt()
        );
    }

    @Transactional
    public RegisterResponseDto acceptInvitation(String rawToken, InvestorInvitationAcceptRequestDto dto) {
        InvestorInvitation invitation = requirePendingInvitation(rawToken);
        String email = normalizeEmail(invitation.getEmail());

        if (isAccountEmailInUse(email)) {
            invitation.setStatus(InvestorInvitationStatus.CANCELLED);
            investorInvitationRepository.save(invitation);
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Invitation can no longer be accepted.");
        }

        LocalDateTime now = LocalDateTime.now();

        Investor investor = new Investor();
        investor.setFirstName(invitation.getFirstName());
        investor.setLastName(invitation.getLastName());
        investor.setCompanyName(normalizeOptionalCompanyName(dto.companyName()));
        investor.setEmail(email);
        investor.setNotificationEmail(email);
        investor.setPhone(dto.phone().trim());
        investor.setPasswordHash(passwordEncoder.encode(dto.password().trim()));
        investor.setStatus(InvestorStatus.APPROVED);
        investor.setApprovedAt(now);

        Investor saved = investorRepository.save(investor);

        invitation.setStatus(InvestorInvitationStatus.ACCEPTED);
        invitation.setAcceptedAt(now);
        invitation.setInvestorId(saved.getId());
        investorInvitationRepository.save(invitation);

        return new RegisterResponseDto(saved.getId(), saved.getEmail(), saved.getStatus().name());
    }

    private InvestorInvitationSendResultDto sendOrResendInvitation(
            long adminId,
            String firstName,
            String lastName,
            String email
    ) {
        LocalDateTime now = LocalDateTime.now();
        InvestorInvitation activeInvitation = reconcilePendingInvitations(email, now);

        String rawToken = generateOpaqueToken();
        LocalDateTime expiresAt = now.plusDays(resolveInvitationTtlDays());

        if (!sendInvitationEmail(email, firstName, rawToken, expiresAt)) {
            return new InvestorInvitationSendResultDto(
                    firstName,
                    lastName,
                    email,
                    InvestorInvitationSendResultStatus.FAILED,
                    "Invitation email could not be delivered."
            );
        }

        if (activeInvitation == null) {
            InvestorInvitation invitation = new InvestorInvitation();
            invitation.setFirstName(firstName);
            invitation.setLastName(lastName);
            invitation.setEmail(email);
            invitation.setTokenHash(hashToken(rawToken));
            invitation.setStatus(InvestorInvitationStatus.PENDING);
            invitation.setExpiresAt(expiresAt);
            invitation.setSentAt(now);
            invitation.setCreatedByAdminId(adminId);
            investorInvitationRepository.save(invitation);

            return new InvestorInvitationSendResultDto(
                    firstName,
                    lastName,
                    email,
                    InvestorInvitationSendResultStatus.SENT,
                    "Invitation email sent."
            );
        }

        activeInvitation.setFirstName(firstName);
        activeInvitation.setLastName(lastName);
        activeInvitation.setTokenHash(hashToken(rawToken));
        activeInvitation.setExpiresAt(expiresAt);
        activeInvitation.setSentAt(now);
        activeInvitation.setCreatedByAdminId(adminId);
        investorInvitationRepository.save(activeInvitation);

        return new InvestorInvitationSendResultDto(
                firstName,
                lastName,
                email,
                InvestorInvitationSendResultStatus.RESENT,
                "Active invitation updated and resent."
        );
    }

    private InvestorInvitation reconcilePendingInvitations(String email, LocalDateTime now) {
        List<InvestorInvitation> pendingInvitations = investorInvitationRepository
                .findByEmailAndStatusOrderByCreatedAtDesc(email, InvestorInvitationStatus.PENDING);

        if (pendingInvitations.isEmpty()) {
            return null;
        }

        InvestorInvitation activeInvitation = null;
        boolean changed = false;

        for (InvestorInvitation invitation : pendingInvitations) {
            if (isExpired(invitation, now)) {
                invitation.setStatus(InvestorInvitationStatus.EXPIRED);
                changed = true;
                continue;
            }

            if (activeInvitation == null) {
                activeInvitation = invitation;
                continue;
            }

            invitation.setStatus(InvestorInvitationStatus.CANCELLED);
            changed = true;
        }

        if (changed) {
            investorInvitationRepository.saveAll(pendingInvitations);
        }

        return activeInvitation;
    }

    private InvestorInvitation requirePendingInvitation(String rawToken) {
        String normalizedToken = normalizeOpaqueToken(rawToken);
        if (normalizedToken.isBlank()) {
            throw invalidInvitation();
        }

        InvestorInvitation invitation = investorInvitationRepository
                .findByTokenHashAndStatus(hashToken(normalizedToken), InvestorInvitationStatus.PENDING)
                .orElseThrow(this::invalidInvitation);

        if (isExpired(invitation, LocalDateTime.now())) {
            invitation.setStatus(InvestorInvitationStatus.EXPIRED);
            investorInvitationRepository.save(invitation);
            throw invalidInvitation();
        }

        return invitation;
    }

    private boolean sendInvitationEmail(
            String email,
            String firstName,
            String rawToken,
            LocalDateTime expiresAt
    ) {
        try {
            return transactionalEmailService.sendTransactional(
                    TransactionalEmailRequest.templateWithFrom(
                            email,
                            INVESTOR_INVITATION_TEMPLATE_ALIAS,
                            buildInvitationModel(firstName, rawToken, expiresAt),
                            buildMichaelMegnaFromAddress()
                    )
            );
        } catch (RuntimeException ex) {
            log.warn("Investor invitation email send threw runtime exception for email={} type={}",
                    email, ex.getClass().getSimpleName());
            return false;
        }
    }

    private Map<String, Object> buildInvitationModel(String firstName, String rawToken, LocalDateTime expiresAt) {
        String greetingName = firstName == null || firstName.isBlank() ? "there" : firstName;
        String actionUrl = buildInvitationLink(rawToken);

        Map<String, Object> model = new LinkedHashMap<>();
        model.put("logo_url", PUBLIC_LOGO_URL);
        model.put("subject", "You're invited to Megna");
        model.put("title", "You're invited to Megna, " + greetingName);
        model.put("message", MICHAEL_MEGNA_DISPLAY_NAME + " invited you to create your investor account at Megna. Complete your setup to start reviewing opportunities.");
        model.put("action_text", "Set up your account");
        model.put("action_url", actionUrl);
        model.put("expiry_note", "This invitation expires on " + expiresAt.toLocalDate() + ".");
        model.put("sender_name", MICHAEL_MEGNA_DISPLAY_NAME);
        model.put("sender_title", "Megna Real Estate");
        model.put("footer_text", "If you need help, reply to this email and our team will assist you.");
        return model;
    }

    private boolean isAccountEmailInUse(String email) {
        return adminRepository.existsByEmail(email)
                || sellerRepository.existsByEmail(email)
                || investorRepository.existsByEmail(email);
    }

    private boolean isExpired(InvestorInvitation invitation, LocalDateTime now) {
        return invitation.getExpiresAt() == null || invitation.getExpiresAt().isBefore(now);
    }

    private long requireAdminUserId() {
        AuthPrincipal principal = SecurityUtils.requirePrincipal();
        if (!"ADMIN".equalsIgnoreCase(principal.role())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Forbidden");
        }
        return principal.userId();
    }

    private long resolveInvitationTtlDays() {
        long configuredDays = authProperties.getInvitationTtlDays();
        return configuredDays > 0 ? configuredDays : 7;
    }

    private String buildInvitationLink(String rawToken) {
        String baseUrl = authProperties.getInvitationUrlBase() == null
                ? ""
                : authProperties.getInvitationUrlBase().trim();
        if (baseUrl.isBlank()) {
            return "";
        }

        String separator = baseUrl.contains("?") ? "&" : "?";
        return baseUrl + separator + "token=" + URLEncoder.encode(rawToken, StandardCharsets.UTF_8);
    }

    private String buildMichaelMegnaFromAddress() {
        String configuredFrom = emailProperties.getFromAddress() == null
                ? ""
                : emailProperties.getFromAddress().trim();
        if (configuredFrom.isBlank()) {
            return "";
        }

        int open = configuredFrom.indexOf('<');
        int close = configuredFrom.indexOf('>');
        String rawAddress = configuredFrom;
        if (open >= 0 && close > open) {
            rawAddress = configuredFrom.substring(open + 1, close).trim();
        }

        return MICHAEL_MEGNA_DISPLAY_NAME + " <" + rawAddress + ">";
    }

    private String generateOpaqueToken() {
        byte[] bytes = new byte[OPAQUE_TOKEN_BYTE_LENGTH];
        SECURE_RANDOM.nextBytes(bytes);
        return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
    }

    private String hashToken(String rawToken) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hash = digest.digest(rawToken.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(hash);
        } catch (NoSuchAlgorithmException ex) {
            throw new IllegalStateException("SHA-256 is not available", ex);
        }
    }

    private ResponseStatusException invalidInvitation() {
        return new ResponseStatusException(HttpStatus.NOT_FOUND, INVALID_INVITATION_MESSAGE);
    }

    private static int countResults(
            List<InvestorInvitationSendResultDto> results,
            InvestorInvitationSendResultStatus status
    ) {
        int count = 0;
        for (InvestorInvitationSendResultDto result : results) {
            if (result.status() == status) {
                count += 1;
            }
        }
        return count;
    }

    private static String normalizeName(String value) {
        return value == null ? "" : value.trim();
    }

    private static String normalizeOptionalCompanyName(String companyName) {
        return companyName == null ? "" : companyName.trim();
    }

    private static String normalizeEmail(String email) {
        if (email == null) {
            return "";
        }
        return email.trim().toLowerCase(Locale.US);
    }

    private static String normalizeOpaqueToken(String token) {
        if (token == null) {
            return "";
        }
        return token.trim();
    }
}

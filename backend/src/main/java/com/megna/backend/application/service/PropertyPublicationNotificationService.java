package com.megna.backend.application.service;

import com.megna.backend.application.service.email.TransactionalEmailRequest;
import com.megna.backend.application.service.email.TransactionalEmailService;
import com.megna.backend.domain.entity.Investor;
import com.megna.backend.domain.entity.Property;
import com.megna.backend.domain.entity.PropertyPublicationNotification;
import com.megna.backend.domain.enums.InvestorStatus;
import com.megna.backend.domain.enums.PropertyPublicationNotificationStatus;
import com.megna.backend.domain.enums.PropertyStatus;
import com.megna.backend.domain.repository.InvestorRepository;
import com.megna.backend.domain.repository.PropertyPublicationNotificationRepository;
import com.megna.backend.domain.repository.PropertyRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;

@Service
@RequiredArgsConstructor
@Slf4j
public class PropertyPublicationNotificationService {

    private static final int MAX_DELIVERY_ATTEMPTS = 5;

    private final PropertyRepository propertyRepository;
    private final InvestorRepository investorRepository;
    private final PropertyPublicationNotificationRepository notificationRepository;
    private final TransactionalEmailService transactionalEmailService;

    @Transactional
    public void enqueueForFirstPublication(Long propertyId) {
        if (propertyId == null || propertyId <= 0) return;

        Property property = propertyRepository.findByIdForUpdate(propertyId).orElse(null);
        if (property == null) return;
        if (property.getStatus() != PropertyStatus.ACTIVE) return;
        if (property.getInvestorNotificationEnqueuedAt() != null) return;

        LocalDateTime now = utcNow();
        property.setInvestorNotificationEnqueuedAt(now);
        propertyRepository.save(property);

        List<Investor> approvedInvestors = investorRepository.findByStatus(InvestorStatus.APPROVED);
        if (approvedInvestors.isEmpty()) {
            return;
        }

        List<PropertyPublicationNotification> pending = new ArrayList<>();
        for (Investor investor : approvedInvestors) {
            String recipient = resolveRecipientEmail(investor);
            if (recipient.isBlank()) continue;

            PropertyPublicationNotification notification = new PropertyPublicationNotification();
            notification.setProperty(property);
            notification.setInvestor(investor);
            notification.setRecipientEmail(recipient);
            notification.setStatus(PropertyPublicationNotificationStatus.PENDING);
            notification.setAttemptCount(0);
            notification.setNextAttemptAt(now);
            pending.add(notification);
        }

        if (pending.isEmpty()) return;
        notificationRepository.saveAll(pending);
    }

    @Scheduled(cron = "${app.email.property-publication-notifications-cron:0 */2 * * * *}")
    @Transactional
    public void processPendingNotifications() {
        LocalDateTime now = utcNow();
        List<PropertyPublicationNotification> due = notificationRepository
                .findTop100ByStatusInAndNextAttemptAtLessThanEqualOrderByNextAttemptAtAscCreatedAtAsc(
                        List.of(
                                PropertyPublicationNotificationStatus.PENDING,
                                PropertyPublicationNotificationStatus.FAILED
                        ),
                        now
                );

        if (due.isEmpty()) return;

        int sent = 0;
        int failed = 0;
        for (PropertyPublicationNotification notification : due) {
            if (processOne(notification)) {
                sent++;
            } else {
                failed++;
            }
        }

        if (failed > 0) {
            log.info("Processed property publication notifications: sent={}, failed={}", sent, failed);
        }
    }

    private boolean processOne(PropertyPublicationNotification notification) {
        if (notification == null) return true;

        LocalDateTime now = utcNow();
        notification.setAttemptCount(notification.getAttemptCount() + 1);

        boolean delivered = sendNotification(notification);
        if (delivered) {
            notification.setStatus(PropertyPublicationNotificationStatus.SENT);
            notification.setSentAt(now);
            notification.setNextAttemptAt(null);
            notification.setLastError(null);
            notificationRepository.save(notification);
            return true;
        }

        notification.setStatus(PropertyPublicationNotificationStatus.FAILED);
        notification.setLastError("delivery_failed");

        if (notification.getAttemptCount() >= MAX_DELIVERY_ATTEMPTS) {
            notification.setNextAttemptAt(null);
        } else {
            notification.setNextAttemptAt(now.plusMinutes(retryDelayMinutes(notification.getAttemptCount())));
        }

        notificationRepository.save(notification);
        return false;
    }

    private boolean sendNotification(PropertyPublicationNotification notification) {
        try {
            return transactionalEmailService.sendTransactional(
                    new TransactionalEmailRequest(
                            notification.getRecipientEmail(),
                            buildSubject(notification),
                            buildBody(notification)
                    )
            );
        } catch (RuntimeException ex) {
            log.warn("Property publication notification email failed unexpectedly: {}", ex.getClass().getSimpleName());
            return false;
        }
    }

    private String buildSubject(PropertyPublicationNotification notification) {
        Property property = notification.getProperty();
        String address = formatAddress(property);
        String label = address.isBlank()
                ? "Property #" + safeNumber(property == null ? null : property.getId())
                : address;
        return "New property available: " + label;
    }

    private String buildBody(PropertyPublicationNotification notification) {
        Property property = notification.getProperty();

        List<String> lines = new ArrayList<>();
        lines.add("A new property was published on Megna.");
        lines.add("");
        lines.add("Property ID: " + safeNumber(property == null ? null : property.getId()));
        lines.add("Address: " + (formatAddress(property).isBlank() ? "N/A" : formatAddress(property)));
        lines.add("Asking Price: " + safeMoney(property == null ? null : property.getAskingPrice()));
        lines.add("ARV: " + safeMoney(property == null ? null : property.getArv()));
        lines.add("Estimated Repairs: " + safeMoney(property == null ? null : property.getEstRepairs()));
        lines.add("");
        lines.add("Sign in to your investor dashboard to view full details.");
        return String.join("\n", lines);
    }

    private static String resolveRecipientEmail(Investor investor) {
        if (investor == null) return "";

        String preferred = normalizeEmail(investor.getNotificationEmail());
        if (!preferred.isBlank()) {
            return preferred;
        }
        return normalizeEmail(investor.getEmail());
    }

    private static String formatAddress(Property property) {
        if (property == null) return "";

        String line1 = joinComma(property.getStreet1(), property.getStreet2());
        String stateZip = joinSpace(property.getState(), property.getZip());
        String line2 = joinComma(property.getCity(), stateZip);
        return joinComma(line1, line2);
    }

    private static String joinComma(String... values) {
        List<String> parts = new ArrayList<>();
        if (values == null) return "";
        for (String value : values) {
            String normalized = value == null ? "" : value.trim();
            if (!normalized.isBlank()) {
                parts.add(normalized);
            }
        }
        return String.join(", ", parts);
    }

    private static String joinSpace(String left, String right) {
        String normalizedLeft = left == null ? "" : left.trim();
        String normalizedRight = right == null ? "" : right.trim();
        if (normalizedLeft.isBlank()) return normalizedRight;
        if (normalizedRight.isBlank()) return normalizedLeft;
        return normalizedLeft + " " + normalizedRight;
    }

    private static String safeNumber(Long value) {
        return value == null ? "N/A" : value.toString();
    }

    private static String safeMoney(java.math.BigDecimal value) {
        if (value == null) return "N/A";
        return "$" + value.toPlainString();
    }

    private static String normalizeEmail(String value) {
        if (value == null) return "";
        return value.trim().toLowerCase(Locale.US);
    }

    private static long retryDelayMinutes(int attemptCount) {
        return switch (attemptCount) {
            case 1 -> 1;
            case 2 -> 5;
            case 3 -> 15;
            case 4 -> 60;
            default -> 180;
        };
    }

    private static LocalDateTime utcNow() {
        return LocalDateTime.now(ZoneOffset.UTC);
    }
}

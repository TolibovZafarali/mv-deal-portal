package com.megna.backend.application.service;

import com.megna.backend.application.service.email.TransactionalEmailRequest;
import com.megna.backend.application.service.email.TransactionalEmailService;
import com.megna.backend.application.service.email.TransactionalEmailDeliveryResult;
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

import java.math.BigDecimal;
import java.text.NumberFormat;
import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;

@Service
@RequiredArgsConstructor
@Slf4j
public class PropertyPublicationNotificationService {

    private static final int MAX_DELIVERY_ATTEMPTS = 5;
    private static final String TEMPLATE_ALIAS = "investor-new-property-published-cid-v1";
    private static final String PUBLIC_LOGO_URL = "https://raw.githubusercontent.com/TolibovZafarali/mv-deal-portal/dev/frontend/public/white-logo.png";

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

        TransactionalEmailDeliveryResult deliveryResult = sendNotification(notification);
        if (deliveryResult.isDelivered()) {
            notification.setStatus(PropertyPublicationNotificationStatus.SENT);
            notification.setSentAt(now);
            notification.setNextAttemptAt(null);
            notification.setLastError(null);
            notificationRepository.save(notification);
            return true;
        }

        notification.setStatus(PropertyPublicationNotificationStatus.FAILED);
        String errorDetail = deliveryResult.detail().isBlank() ? "delivery_failed" : deliveryResult.detail();
        notification.setLastError(errorDetail);

        if (!deliveryResult.shouldRetry() || notification.getAttemptCount() >= MAX_DELIVERY_ATTEMPTS) {
            notification.setNextAttemptAt(null);
        } else {
            notification.setNextAttemptAt(now.plusMinutes(retryDelayMinutes(notification.getAttemptCount())));
        }

        notificationRepository.save(notification);
        return false;
    }

    private TransactionalEmailDeliveryResult sendNotification(PropertyPublicationNotification notification) {
        try {
            return transactionalEmailService.sendTransactionalDetailed(
                    TransactionalEmailRequest.template(
                            notification.getRecipientEmail(),
                            TEMPLATE_ALIAS,
                            buildTemplateModel(notification)
                    )
            );
        } catch (RuntimeException ex) {
            log.warn("Property publication notification email failed unexpectedly: {}", ex.getClass().getSimpleName());
            return TransactionalEmailDeliveryResult.unknown("service_exception_" + ex.getClass().getSimpleName());
        }
    }

    private Map<String, Object> buildTemplateModel(PropertyPublicationNotification notification) {
        Property property = notification.getProperty();
        Investor investor = notification.getInvestor();
        String address = formatAddress(property);
        String propertyId = safeNumber(property == null ? null : property.getId());
        String propertyAddress = address.isBlank() ? "N/A" : address;
        String actionUrl = property == null || property.getId() == null
                ? "https://megna-realestate.com/properties"
                : "https://megna-realestate.com/properties/" + property.getId();
        String investorName = resolveInvestorGreetingName(investor);

        Map<String, Object> model = new LinkedHashMap<>();
        model.put("logo_url", PUBLIC_LOGO_URL);
        model.put("subject", "New property published");
        model.put("title", "A new property just went live, " + investorName);
        model.put("message", "A listing that matches your interest has been published, " + investorName + ".");
        model.put("investor_name", investorName);
        model.put("property_address", propertyAddress);
        model.put("property_price", safeMoney(property == null ? null : property.getAskingPrice()));
        model.put("action_text", "View Property");
        model.put("action_url", actionUrl);
        model.put("footer_text", "You're receiving this because property notifications are enabled on your account.");
        model.put("property_id", propertyId);
        return model;
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

    private static String safeMoney(BigDecimal value) {
        if (value == null) return "N/A";
        NumberFormat currencyFormatter = NumberFormat.getCurrencyInstance(Locale.US);
        currencyFormatter.setMinimumFractionDigits(0);
        currencyFormatter.setMaximumFractionDigits(2);
        return currencyFormatter.format(value);
    }

    private static String normalizeEmail(String value) {
        if (value == null) return "";
        return value.trim().toLowerCase(Locale.US);
    }

    private static String resolveInvestorGreetingName(Investor investor) {
        if (investor == null) {
            return "there";
        }
        String firstName = investor.getFirstName() == null ? "" : investor.getFirstName().trim();
        if (!firstName.isBlank()) {
            return firstName;
        }
        String lastName = investor.getLastName() == null ? "" : investor.getLastName().trim();
        if (!lastName.isBlank()) {
            return lastName;
        }
        return "there";
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

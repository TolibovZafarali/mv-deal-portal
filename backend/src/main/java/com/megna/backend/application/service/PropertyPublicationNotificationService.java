package com.megna.backend.application.service;

import com.megna.backend.application.service.email.TransactionalEmailRequest;
import com.megna.backend.application.service.email.TransactionalEmailService;
import com.megna.backend.domain.entity.Investor;
import com.megna.backend.domain.entity.Property;
import com.megna.backend.domain.entity.PropertyPhoto;
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
                    TransactionalEmailRequest.template(
                            notification.getRecipientEmail(),
                            TEMPLATE_ALIAS,
                            buildTemplateModel(notification)
                    )
            );
        } catch (RuntimeException ex) {
            log.warn("Property publication notification email failed unexpectedly: {}", ex.getClass().getSimpleName());
            return false;
        }
    }

    private Map<String, Object> buildTemplateModel(PropertyPublicationNotification notification) {
        Property property = notification.getProperty();
        String address = formatAddress(property);
        String propertyId = safeNumber(property == null ? null : property.getId());
        String propertyAddress = address.isBlank() ? "N/A" : address;
        String actionUrl = property == null || property.getId() == null
                ? "https://megna-realestate.com/properties"
                : "https://megna-realestate.com/properties/" + property.getId();

        Map<String, Object> model = new LinkedHashMap<>();
        model.put("logo_url", PUBLIC_LOGO_URL);
        model.put("subject", "New property published");
        model.put("title", "A new property just went live");
        model.put("message", "A listing that matches your interest has been published.");
        model.put("property_photo_url", resolvePropertyPhotoUrl(property));
        model.put("property_address", propertyAddress);
        model.put("property_price", safeMoney(property == null ? null : property.getAskingPrice()));
        model.put("action_text", "View Property");
        model.put("action_url", actionUrl);
        model.put("footer_text", "You're receiving this because property notifications are enabled on your account.");
        model.put("property_id", propertyId);
        return model;
    }

    private static String resolvePropertyPhotoUrl(Property property) {
        if (property == null || property.getPhotos() == null || property.getPhotos().isEmpty()) {
            return "";
        }
        for (PropertyPhoto photo : property.getPhotos()) {
            if (photo == null) {
                continue;
            }
            String thumbnail = normalizePublicImageUrl(photo.getThumbnailUrl());
            if (!thumbnail.isBlank()) {
                return thumbnail;
            }
            String full = normalizePublicImageUrl(photo.getUrl());
            if (!full.isBlank()) {
                return full;
            }
        }
        return "";
    }

    private static String normalizePublicImageUrl(String url) {
        if (url == null) {
            return "";
        }
        String normalized = url.trim();
        if (normalized.isBlank()) {
            return "";
        }
        String lower = normalized.toLowerCase(Locale.US);
        if (lower.startsWith("https://") || lower.startsWith("http://")) {
            return normalized;
        }
        return "";
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

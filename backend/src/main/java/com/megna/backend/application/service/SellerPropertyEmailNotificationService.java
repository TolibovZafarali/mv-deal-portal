package com.megna.backend.application.service;

import com.megna.backend.application.service.email.TransactionalEmailRequest;
import com.megna.backend.application.service.email.TransactionalEmailService;
import com.megna.backend.domain.entity.Property;
import com.megna.backend.domain.entity.Seller;
import com.megna.backend.infrastructure.config.ContactProperties;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.text.NumberFormat;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.time.ZoneOffset;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;

@Service
@RequiredArgsConstructor
@Slf4j
public class SellerPropertyEmailNotificationService {

    private static final String ADMIN_TEMPLATE_ALIAS = "admin-seller-property-submitted-cid-v1";
    private static final String SELLER_TEMPLATE_ALIAS = "seller-property-published-cid-v1";
    private static final String PUBLIC_LOGO_URL =
            "https://raw.githubusercontent.com/TolibovZafarali/mv-deal-portal/dev/frontend/public/white-logo.png";
    private static final DateTimeFormatter DATE_TIME_FORMATTER =
            DateTimeFormatter.ofPattern("yyyy-MM-dd hh:mm a z");

    private final TransactionalEmailService transactionalEmailService;
    private final ContactProperties contactProperties;

    public void notifyAdminPropertySubmitted(Property property) {
        String recipient = normalizeEmail(contactProperties.getSellerInbox());
        if (recipient.isBlank()) {
            return;
        }

        sendTemplateEmail(recipient, ADMIN_TEMPLATE_ALIAS, buildAdminSubmissionModel(property), "admin");
    }

    public void notifySellerPropertyPublished(Property property) {
        String recipient = resolveSellerRecipientEmail(property == null ? null : property.getSeller());
        if (recipient.isBlank()) {
            return;
        }

        sendTemplateEmail(recipient, SELLER_TEMPLATE_ALIAS, buildSellerPublishedModel(property), "seller");
    }

    private void sendTemplateEmail(String to, String alias, Map<String, Object> model, String audience) {
        try {
            boolean sent = transactionalEmailService.sendTransactional(
                    TransactionalEmailRequest.template(to, alias, model)
            );
            if (!sent) {
                log.warn("Seller property {} notification email was not delivered (alias={})", audience, alias);
            }
        } catch (RuntimeException ex) {
            log.warn(
                    "Seller property {} notification email send threw runtime exception (alias={}, type={})",
                    audience,
                    alias,
                    ex.getClass().getSimpleName()
            );
        }
    }

    private static Map<String, Object> buildAdminSubmissionModel(Property property) {
        Map<String, Object> model = new LinkedHashMap<>();
        model.put("logo_url", PUBLIC_LOGO_URL);
        model.put("subject", "Seller submitted a property for review");
        model.put("title", "A seller listing is ready for admin review");
        model.put("message", "A seller submitted a property and it is now waiting in the review queue.");
        model.put("property_id", safeNumber(property == null ? null : property.getId()));
        model.put("seller_name", resolveSellerName(property == null ? null : property.getSeller()));
        model.put("seller_email", resolveSellerEmail(property == null ? null : property.getSeller()));
        model.put("property_address", formatAddress(property));
        model.put("submitted_at", formatDateTime(property == null ? null : property.getSubmittedAt()));
        model.put("action_text", "Open Submitted Listings");
        model.put("action_url", "https://megna.us/admin/properties?tab=submitted");
        model.put("footer_text", "This notification was sent because a seller submitted a listing for review.");
        return model;
    }

    private static Map<String, Object> buildSellerPublishedModel(Property property) {
        Map<String, Object> model = new LinkedHashMap<>();
        Long propertyId = property == null ? null : property.getId();
        Seller seller = property == null ? null : property.getSeller();
        String sellerName = resolveSellerName(seller);
        String greetingName = resolveGreetingName(seller);
        model.put("logo_url", PUBLIC_LOGO_URL);
        model.put("subject", "Your property is now published");
        model.put("title", "Your listing is live, " + greetingName);
        model.put("message", "Great news, " + greetingName + ". Your property passed review and is now visible to approved investors.");
        model.put("seller_name", sellerName);
        model.put("property_id", safeNumber(propertyId));
        model.put("property_address", formatAddress(property));
        model.put("property_price", safeMoney(property == null ? null : property.getAskingPrice()));
        model.put("published_at", formatDateTime(property == null ? null : property.getPublishedAt()));
        model.put("action_text", "View Listing");
        model.put(
                "action_url",
                propertyId == null
                        ? "https://megna.us/seller/listings"
                        : "https://megna.us/seller/listings/" + propertyId + "/edit"
        );
        model.put("footer_text", "Need to make a change? Contact Megna support from your seller dashboard.");
        return model;
    }

    private static String resolveSellerRecipientEmail(Seller seller) {
        if (seller == null) {
            return "";
        }
        String notificationEmail = normalizeEmail(seller.getNotificationEmail());
        if (!notificationEmail.isBlank()) {
            return notificationEmail;
        }
        return normalizeEmail(seller.getEmail());
    }

    private static String resolveSellerEmail(Seller seller) {
        if (seller == null) {
            return "N/A";
        }
        String email = normalizeEmail(seller.getEmail());
        return email.isBlank() ? "N/A" : email;
    }

    private static String resolveSellerName(Seller seller) {
        if (seller == null) {
            return "N/A";
        }
        List<String> parts = new ArrayList<>();
        if (seller.getFirstName() != null && !seller.getFirstName().trim().isBlank()) {
            parts.add(seller.getFirstName().trim());
        }
        if (seller.getLastName() != null && !seller.getLastName().trim().isBlank()) {
            parts.add(seller.getLastName().trim());
        }
        String fullName = String.join(" ", parts);
        if (!fullName.isBlank()) {
            return fullName;
        }
        if (seller.getCompanyName() != null && !seller.getCompanyName().trim().isBlank()) {
            return seller.getCompanyName().trim();
        }
        return "N/A";
    }

    private static String resolveGreetingName(Seller seller) {
        if (seller == null) {
            return "there";
        }
        if (seller.getFirstName() != null) {
            String firstName = seller.getFirstName().trim();
            if (!firstName.isBlank()) {
                return firstName;
            }
        }
        String fullName = resolveSellerName(seller);
        return "N/A".equals(fullName) ? "there" : fullName;
    }

    private static String formatAddress(Property property) {
        if (property == null) {
            return "N/A";
        }
        String line1 = joinComma(property.getStreet1(), property.getStreet2());
        String stateZip = joinSpace(property.getState(), property.getZip());
        String line2 = joinComma(property.getCity(), stateZip);
        String address = joinComma(line1, line2);
        return address.isBlank() ? "N/A" : address;
    }

    private static String joinComma(String... values) {
        if (values == null) {
            return "";
        }
        List<String> parts = new ArrayList<>();
        for (String value : values) {
            if (value == null) {
                continue;
            }
            String normalized = value.trim();
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
        if (value == null) {
            return "N/A";
        }
        NumberFormat currencyFormatter = NumberFormat.getCurrencyInstance(Locale.US);
        currencyFormatter.setMinimumFractionDigits(0);
        currencyFormatter.setMaximumFractionDigits(2);
        return currencyFormatter.format(value);
    }

    private static String formatDateTime(LocalDateTime value) {
        if (value == null) {
            return "N/A";
        }
        return value.atZone(ZoneOffset.UTC)
                .withZoneSameInstant(ZoneId.of("America/Chicago"))
                .format(DATE_TIME_FORMATTER);
    }

    private static String normalizeEmail(String value) {
        if (value == null) {
            return "";
        }
        return value.trim().toLowerCase(Locale.US);
    }
}

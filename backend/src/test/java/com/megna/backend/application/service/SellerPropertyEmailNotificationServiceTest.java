package com.megna.backend.application.service;

import com.megna.backend.application.service.email.TransactionalEmailRequest;
import com.megna.backend.application.service.email.TransactionalEmailService;
import com.megna.backend.domain.entity.Property;
import com.megna.backend.domain.entity.Seller;
import com.megna.backend.infrastructure.config.ContactProperties;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class SellerPropertyEmailNotificationServiceTest {

    @Mock
    private TransactionalEmailService transactionalEmailService;

    @Mock
    private ContactProperties contactProperties;

    @InjectMocks
    private SellerPropertyEmailNotificationService service;

    @Test
    void notifyAdminPropertySubmittedUsesAdminTemplateAliasAndSellerInboxRecipient() {
        when(contactProperties.getSellerInbox()).thenReturn("seller-inbox@megna-realestate.com");
        when(transactionalEmailService.sendTransactional(org.mockito.ArgumentMatchers.any())).thenReturn(true);

        Property property = propertyWithSeller(501L);
        property.setSubmittedAt(LocalDateTime.of(2026, 3, 10, 15, 45));

        service.notifyAdminPropertySubmitted(property);

        ArgumentCaptor<TransactionalEmailRequest> emailCaptor = ArgumentCaptor.forClass(TransactionalEmailRequest.class);
        verify(transactionalEmailService).sendTransactional(emailCaptor.capture());
        TransactionalEmailRequest request = emailCaptor.getValue();
        assertEquals("seller-inbox@megna-realestate.com", request.to());
        assertEquals("admin-seller-property-submitted-cid-v1", request.templateAlias());

        @SuppressWarnings("unchecked")
        Map<String, Object> model = (Map<String, Object>) request.templateModel();
        assertEquals("501", model.get("property_id"));
        assertEquals("Alex Seller", model.get("seller_name"));
        assertEquals("seller@example.com", model.get("seller_email"));
        assertEquals("123 Main St, St Louis, MO 63101", model.get("property_address"));
        assertTrue(model.get("submitted_at").toString().contains("C"));
    }

    @Test
    void notifySellerPropertyPublishedUsesNotificationEmailAndPublishedTemplateAlias() {
        when(transactionalEmailService.sendTransactional(org.mockito.ArgumentMatchers.any())).thenReturn(true);

        Property property = propertyWithSeller(601L);
        property.setPublishedAt(LocalDateTime.of(2026, 3, 10, 16, 5));

        service.notifySellerPropertyPublished(property);

        ArgumentCaptor<TransactionalEmailRequest> emailCaptor = ArgumentCaptor.forClass(TransactionalEmailRequest.class);
        verify(transactionalEmailService).sendTransactional(emailCaptor.capture());
        TransactionalEmailRequest request = emailCaptor.getValue();
        assertEquals("notify@example.com", request.to());
        assertEquals("seller-property-published-cid-v1", request.templateAlias());

        @SuppressWarnings("unchecked")
        Map<String, Object> model = (Map<String, Object>) request.templateModel();
        assertEquals("601", model.get("property_id"));
        assertEquals("$120000", model.get("property_price"));
        assertEquals("123 Main St, St Louis, MO 63101", model.get("property_address"));
        assertTrue(model.get("published_at").toString().contains("C"));
        assertTrue(model.get("action_url").toString().endsWith("/seller/properties/601"));
    }

    @Test
    void notifySellerPropertyPublishedFallsBackToPrimaryEmailWhenNotificationEmailMissing() {
        when(transactionalEmailService.sendTransactional(org.mockito.ArgumentMatchers.any())).thenReturn(true);

        Property property = propertyWithSeller(701L);
        property.getSeller().setNotificationEmail(" ");

        service.notifySellerPropertyPublished(property);

        ArgumentCaptor<TransactionalEmailRequest> emailCaptor = ArgumentCaptor.forClass(TransactionalEmailRequest.class);
        verify(transactionalEmailService).sendTransactional(emailCaptor.capture());
        assertEquals("seller@example.com", emailCaptor.getValue().to());
    }

    @Test
    void notifyAdminPropertySubmittedSkipsWhenSellerInboxMissing() {
        when(contactProperties.getSellerInbox()).thenReturn(" ");

        service.notifyAdminPropertySubmitted(propertyWithSeller(801L));

        verify(transactionalEmailService, never()).sendTransactional(org.mockito.ArgumentMatchers.any());
    }

    private static Property propertyWithSeller(Long id) {
        Seller seller = new Seller();
        seller.setId(10L);
        seller.setFirstName("Alex");
        seller.setLastName("Seller");
        seller.setEmail("seller@example.com");
        seller.setNotificationEmail("notify@example.com");

        Property property = new Property();
        property.setId(id);
        property.setSeller(seller);
        property.setStreet1("123 Main St");
        property.setCity("St Louis");
        property.setState("MO");
        property.setZip("63101");
        property.setAskingPrice(new BigDecimal("120000"));
        return property;
    }
}

package com.megna.backend.application.service;

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
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.atLeastOnce;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class PropertyPublicationNotificationServiceTest {

    @Mock
    private PropertyRepository propertyRepository;

    @Mock
    private InvestorRepository investorRepository;

    @Mock
    private PropertyPublicationNotificationRepository notificationRepository;

    @Mock
    private TransactionalEmailService transactionalEmailService;

    @InjectMocks
    private PropertyPublicationNotificationService service;

    @Test
    void enqueueForFirstPublicationCreatesPendingNotificationsForApprovedInvestors() {
        Property property = property(101L, PropertyStatus.ACTIVE);
        when(propertyRepository.findByIdForUpdate(101L)).thenReturn(Optional.of(property));

        Investor first = investor(10L, "investor1@example.com", "");
        Investor second = investor(11L, "investor2@example.com", "notify2@example.com");
        when(investorRepository.findByStatus(InvestorStatus.APPROVED)).thenReturn(List.of(first, second));

        service.enqueueForFirstPublication(101L);

        assertNotNull(property.getInvestorNotificationEnqueuedAt());
        verify(propertyRepository).save(property);

        @SuppressWarnings("unchecked")
        ArgumentCaptor<List<PropertyPublicationNotification>> captor = ArgumentCaptor.forClass(List.class);
        verify(notificationRepository).saveAll(captor.capture());

        List<PropertyPublicationNotification> queued = captor.getValue();
        assertEquals(2, queued.size());
        assertEquals("investor1@example.com", queued.get(0).getRecipientEmail());
        assertEquals("notify2@example.com", queued.get(1).getRecipientEmail());
        assertEquals(PropertyPublicationNotificationStatus.PENDING, queued.get(0).getStatus());
        assertNotNull(queued.get(0).getNextAttemptAt());
    }

    @Test
    void enqueueForFirstPublicationSkipsWhenAlreadyEnqueued() {
        Property property = property(102L, PropertyStatus.ACTIVE);
        property.setInvestorNotificationEnqueuedAt(LocalDateTime.now(ZoneOffset.UTC).minusMinutes(1));
        when(propertyRepository.findByIdForUpdate(102L)).thenReturn(Optional.of(property));

        service.enqueueForFirstPublication(102L);

        verify(notificationRepository, never()).saveAll(any());
        verify(propertyRepository, never()).save(any(Property.class));
    }

    @Test
    void processPendingNotificationsMarksSentOnSuccessfulDelivery() {
        PropertyPublicationNotification notification = notification(201L, 301L);
        when(notificationRepository.findTop100ByStatusInAndNextAttemptAtLessThanEqualOrderByNextAttemptAtAscCreatedAtAsc(any(), any()))
                .thenReturn(List.of(notification));
        when(transactionalEmailService.sendTransactional(any())).thenReturn(true);

        service.processPendingNotifications();

        verify(notificationRepository).save(notification);
        ArgumentCaptor<com.megna.backend.application.service.email.TransactionalEmailRequest> emailCaptor =
                ArgumentCaptor.forClass(com.megna.backend.application.service.email.TransactionalEmailRequest.class);
        verify(transactionalEmailService, atLeastOnce()).sendTransactional(emailCaptor.capture());
        assertEquals("investor-new-property-published-cid-v1", emailCaptor.getValue().templateAlias());
        @SuppressWarnings("unchecked")
        Map<String, Object> templateModel = (Map<String, Object>) emailCaptor.getValue().templateModel();
        assertEquals(
                "https://storage.googleapis.com/mv-photos-prod/thumb/2026/02/property-301.jpg",
                templateModel.get("property_photo_url")
        );
        assertEquals(PropertyPublicationNotificationStatus.SENT, notification.getStatus());
        assertEquals(1, notification.getAttemptCount());
        assertNull(notification.getNextAttemptAt());
        assertNotNull(notification.getSentAt());
        assertNull(notification.getLastError());
    }

    @Test
    void processPendingNotificationsSchedulesRetryWhenDeliveryFails() {
        PropertyPublicationNotification notification = notification(202L, 302L);
        when(notificationRepository.findTop100ByStatusInAndNextAttemptAtLessThanEqualOrderByNextAttemptAtAscCreatedAtAsc(any(), any()))
                .thenReturn(List.of(notification));
        when(transactionalEmailService.sendTransactional(any())).thenReturn(false);

        LocalDateTime before = LocalDateTime.now(ZoneOffset.UTC);
        service.processPendingNotifications();

        verify(notificationRepository).save(notification);
        assertEquals(PropertyPublicationNotificationStatus.FAILED, notification.getStatus());
        assertEquals(1, notification.getAttemptCount());
        assertNotNull(notification.getNextAttemptAt());
        assertTrue(notification.getNextAttemptAt().isAfter(before));
    }

    @Test
    void processPendingNotificationsStopsRetryingAfterMaxAttempts() {
        PropertyPublicationNotification notification = notification(203L, 303L);
        notification.setAttemptCount(4);
        when(notificationRepository.findTop100ByStatusInAndNextAttemptAtLessThanEqualOrderByNextAttemptAtAscCreatedAtAsc(any(), any()))
                .thenReturn(List.of(notification));
        when(transactionalEmailService.sendTransactional(any())).thenReturn(false);

        service.processPendingNotifications();

        verify(notificationRepository).save(notification);
        assertEquals(PropertyPublicationNotificationStatus.FAILED, notification.getStatus());
        assertEquals(5, notification.getAttemptCount());
        assertNull(notification.getNextAttemptAt());
    }

    private static Property property(Long id, PropertyStatus status) {
        Property property = new Property();
        property.setId(id);
        property.setStatus(status);
        property.setStreet1("123 Main St");
        property.setCity("St Louis");
        property.setState("MO");
        property.setZip("63101");
        PropertyPhoto photo = new PropertyPhoto();
        photo.setProperty(property);
        photo.setSortOrder(0);
        photo.setUrl("https://storage.googleapis.com/mv-photos-prod/display/2026/02/property-" + id + ".jpg");
        photo.setThumbnailUrl("https://storage.googleapis.com/mv-photos-prod/thumb/2026/02/property-" + id + ".jpg");
        photo.setPhotoAssetId("asset-" + id);
        property.getPhotos().add(photo);
        return property;
    }

    private static Investor investor(Long id, String email, String notificationEmail) {
        Investor investor = new Investor();
        investor.setId(id);
        investor.setEmail(email);
        investor.setNotificationEmail(notificationEmail);
        investor.setStatus(InvestorStatus.APPROVED);
        return investor;
    }

    private static PropertyPublicationNotification notification(Long id, Long propertyId) {
        PropertyPublicationNotification notification = new PropertyPublicationNotification();
        notification.setId(id);
        notification.setProperty(property(propertyId, PropertyStatus.ACTIVE));
        notification.setRecipientEmail("investor@example.com");
        notification.setStatus(PropertyPublicationNotificationStatus.PENDING);
        notification.setAttemptCount(0);
        notification.setNextAttemptAt(LocalDateTime.now(ZoneOffset.UTC).minusMinutes(1));
        return notification;
    }
}

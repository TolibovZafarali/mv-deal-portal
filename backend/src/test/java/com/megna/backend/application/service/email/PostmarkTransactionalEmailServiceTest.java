package com.megna.backend.application.service.email;

import com.megna.backend.infrastructure.config.EmailProperties;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class PostmarkTransactionalEmailServiceTest {

    @Mock
    private EmailProperties emailProperties;

    @Mock
    private PostmarkEmailClient postmarkEmailClient;

    @Mock
    private EmailSuppressionService emailSuppressionService;

    @Test
    void sendTransactionalSuppressesNonProdRecipientNotOnAllowlist() {
        PostmarkTransactionalEmailService service = new PostmarkTransactionalEmailService(
                emailProperties,
                postmarkEmailClient,
                emailSuppressionService
        );

        when(emailProperties.isEnabled()).thenReturn(true);
        when(emailProperties.isProduction()).thenReturn(false);
        when(emailProperties.getFromAddress()).thenReturn("no-reply@megna.us");
        when(emailProperties.getReplyToAddress()).thenReturn("contact@megna.us");
        when(emailProperties.getPostmarkServerToken()).thenReturn("token");
        when(emailProperties.getPostmarkMessageStream()).thenReturn("transactional");
        when(emailProperties.getNonProductionAllowlist()).thenReturn(List.of("allowlisted@example.com"));

        boolean sent = service.sendTransactional(new TransactionalEmailRequest(
                "not-allowlisted@example.com",
                "Test",
                "Body"
        ));

        assertFalse(sent);
        verify(postmarkEmailClient, never()).sendDetailed(any());
    }

    @Test
    void sendTransactionalSendsWhenNonProdRecipientAllowlisted() {
        PostmarkTransactionalEmailService service = new PostmarkTransactionalEmailService(
                emailProperties,
                postmarkEmailClient,
                emailSuppressionService
        );

        when(emailProperties.isEnabled()).thenReturn(true);
        when(emailProperties.isProduction()).thenReturn(false);
        when(emailProperties.getFromAddress()).thenReturn("no-reply@megna.us");
        when(emailProperties.getReplyToAddress()).thenReturn("contact@megna.us");
        when(emailProperties.getPostmarkServerToken()).thenReturn("token");
        when(emailProperties.getPostmarkMessageStream()).thenReturn("transactional");
        when(emailProperties.getNonProductionAllowlist()).thenReturn(List.of("allowlisted@example.com"));
        when(postmarkEmailClient.sendDetailed(any()))
                .thenReturn(TransactionalEmailDeliveryResult.delivered("ok", "msg-1"));

        boolean sent = service.sendTransactional(new TransactionalEmailRequest(
                "AllowListed@example.com",
                "Test",
                "Body"
        ));

        assertTrue(sent);
        verify(postmarkEmailClient).sendDetailed(any());
    }

    @Test
    void sendTransactionalBypassesAllowlistInProduction() {
        PostmarkTransactionalEmailService service = new PostmarkTransactionalEmailService(
                emailProperties,
                postmarkEmailClient,
                emailSuppressionService
        );

        when(emailProperties.isEnabled()).thenReturn(true);
        when(emailProperties.isProduction()).thenReturn(true);
        when(emailProperties.getFromAddress()).thenReturn("no-reply@megna.us");
        when(emailProperties.getReplyToAddress()).thenReturn("contact@megna.us");
        when(emailProperties.getPostmarkServerToken()).thenReturn("token");
        when(emailProperties.getPostmarkMessageStream()).thenReturn("transactional");
        when(emailSuppressionService.isSuppressed("anyone@example.com")).thenReturn(false);
        when(postmarkEmailClient.sendDetailed(any()))
                .thenReturn(TransactionalEmailDeliveryResult.delivered("ok", "msg-1"));

        boolean sent = service.sendTransactional(new TransactionalEmailRequest(
                "anyone@example.com",
                "Test",
                "Body"
        ));

        assertTrue(sent);
        verify(postmarkEmailClient).sendDetailed(any());
    }

    @Test
    void sendTransactionalReturnsFalseWhenDisabled() {
        PostmarkTransactionalEmailService service = new PostmarkTransactionalEmailService(
                emailProperties,
                postmarkEmailClient,
                emailSuppressionService
        );

        when(emailProperties.isEnabled()).thenReturn(false);

        boolean sent = service.sendTransactional(new TransactionalEmailRequest(
                "anyone@example.com",
                "Test",
                "Body"
        ));

        assertFalse(sent);
        verify(postmarkEmailClient, never()).sendDetailed(any());
    }

    @Test
    void sendTransactionalReturnsFalseWhenMisconfigured() {
        PostmarkTransactionalEmailService service = new PostmarkTransactionalEmailService(
                emailProperties,
                postmarkEmailClient,
                emailSuppressionService
        );

        when(emailProperties.isEnabled()).thenReturn(true);
        when(emailProperties.getFromAddress()).thenReturn("no-reply@megna.us");
        when(emailProperties.getReplyToAddress()).thenReturn("contact@megna.us");
        when(emailProperties.getPostmarkServerToken()).thenReturn("");

        boolean sent = service.sendTransactional(new TransactionalEmailRequest(
                "anyone@example.com",
                "Test",
                "Body"
        ));

        assertFalse(sent);
        verify(postmarkEmailClient, never()).sendDetailed(any());
    }

    @Test
    void sendTransactionalSuppressesProductionRecipientWhenAddressIsSuppressed() {
        PostmarkTransactionalEmailService service = new PostmarkTransactionalEmailService(
                emailProperties,
                postmarkEmailClient,
                emailSuppressionService
        );

        when(emailProperties.isEnabled()).thenReturn(true);
        when(emailProperties.isProduction()).thenReturn(true);
        when(emailProperties.getFromAddress()).thenReturn("no-reply@megna.us");
        when(emailProperties.getReplyToAddress()).thenReturn("contact@megna.us");
        when(emailProperties.getPostmarkServerToken()).thenReturn("token");
        when(emailProperties.getPostmarkMessageStream()).thenReturn("transactional");
        when(emailSuppressionService.isSuppressed("suppressed@example.com")).thenReturn(true);

        boolean sent = service.sendTransactional(new TransactionalEmailRequest(
                "suppressed@example.com",
                "Test",
                "Body"
        ));

        assertFalse(sent);
        verify(postmarkEmailClient, never()).sendDetailed(any());
    }
}

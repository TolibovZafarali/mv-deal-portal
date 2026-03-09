package com.megna.backend.application.service.email;

import lombok.extern.slf4j.Slf4j;
import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.util.Base64;
import java.util.List;

@Component
@Slf4j
public class EmailTemplateAssetService {

    private static final String LOGO_RESOURCE_PATH = "email/white-logo.png";

    private final List<TransactionalEmailRequest.EmailAttachment> defaultTemplateAttachments;

    public EmailTemplateAssetService() {
        this.defaultTemplateAttachments = loadDefaultTemplateAttachments();
    }

    public List<TransactionalEmailRequest.EmailAttachment> defaultTemplateAttachments() {
        return defaultTemplateAttachments;
    }

    private static List<TransactionalEmailRequest.EmailAttachment> loadDefaultTemplateAttachments() {
        ClassPathResource resource = new ClassPathResource(LOGO_RESOURCE_PATH);
        if (!resource.exists()) {
            log.warn("Template logo resource not found on classpath: {}", LOGO_RESOURCE_PATH);
            return List.of();
        }

        try {
            byte[] bytes = resource.getInputStream().readAllBytes();
            String base64 = Base64.getEncoder().encodeToString(bytes);
            return List.of(new TransactionalEmailRequest.EmailAttachment(
                    "white-logo.png",
                    "image/png",
                    base64,
                    "cid:mv-logo-white"
            ));
        } catch (IOException ex) {
            log.warn("Failed to load template logo resource: {}", LOGO_RESOURCE_PATH);
            return List.of();
        }
    }
}

package com.megna.backend.application.service.email;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

public record TransactionalEmailRequest(
        String to,
        String subject,
        String textBody,
        String templateAlias,
        Map<String, Object> templateModel,
        List<EmailAttachment> attachments
) {

    public TransactionalEmailRequest(String to, String subject, String textBody) {
        this(to, subject, textBody, null, Map.of(), List.of());
    }

    public TransactionalEmailRequest {
        templateModel = templateModel == null
                ? Map.of()
                : Map.copyOf(new LinkedHashMap<>(templateModel));
        attachments = attachments == null ? List.of() : List.copyOf(attachments);
    }

    public static TransactionalEmailRequest template(
            String to,
            String templateAlias,
            Map<String, Object> templateModel
    ) {
        return new TransactionalEmailRequest(to, null, null, templateAlias, templateModel, List.of());
    }

    public TransactionalEmailRequest withAttachments(List<EmailAttachment> attachments) {
        return new TransactionalEmailRequest(
                to,
                subject,
                textBody,
                templateAlias,
                templateModel,
                attachments
        );
    }

    public boolean isTemplate() {
        return templateAlias != null && !templateAlias.trim().isBlank();
    }

    public record EmailAttachment(
            String name,
            String contentType,
            String content,
            String contentId
    ) {
    }
}

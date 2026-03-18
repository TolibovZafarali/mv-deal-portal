package com.megna.backend.application.service.email;

import java.util.LinkedHashMap;
import java.util.Map;

public record TransactionalEmailRequest(
        String to,
        String subject,
        String textBody,
        String templateAlias,
        Map<String, Object> templateModel,
        String fromOverride
) {

    public TransactionalEmailRequest(String to, String subject, String textBody) {
        this(to, subject, textBody, null, Map.of(), null);
    }

    public TransactionalEmailRequest(
            String to,
            String subject,
            String textBody,
            String templateAlias,
            Map<String, Object> templateModel
    ) {
        this(to, subject, textBody, templateAlias, templateModel, null);
    }

    public TransactionalEmailRequest {
        templateModel = templateModel == null
                ? Map.of()
                : Map.copyOf(new LinkedHashMap<>(templateModel));
        fromOverride = blankToNull(fromOverride);
    }

    public static TransactionalEmailRequest template(
            String to,
            String templateAlias,
            Map<String, Object> templateModel
    ) {
        return new TransactionalEmailRequest(to, null, null, templateAlias, templateModel, null);
    }

    public static TransactionalEmailRequest templateWithFrom(
            String to,
            String templateAlias,
            Map<String, Object> templateModel,
            String fromOverride
    ) {
        return new TransactionalEmailRequest(to, null, null, templateAlias, templateModel, fromOverride);
    }

    public boolean isTemplate() {
        return templateAlias != null && !templateAlias.trim().isBlank();
    }

    private static String blankToNull(String value) {
        if (value == null) {
            return null;
        }

        String normalized = value.trim();
        return normalized.isBlank() ? null : normalized;
    }
}

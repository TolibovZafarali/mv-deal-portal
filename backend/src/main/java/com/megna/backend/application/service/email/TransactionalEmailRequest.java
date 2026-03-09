package com.megna.backend.application.service.email;

import java.util.LinkedHashMap;
import java.util.Map;

public record TransactionalEmailRequest(
        String to,
        String subject,
        String textBody,
        String templateAlias,
        Map<String, Object> templateModel
) {

    public TransactionalEmailRequest(String to, String subject, String textBody) {
        this(to, subject, textBody, null, Map.of());
    }

    public TransactionalEmailRequest {
        templateModel = templateModel == null
                ? Map.of()
                : Map.copyOf(new LinkedHashMap<>(templateModel));
    }

    public static TransactionalEmailRequest template(
            String to,
            String templateAlias,
            Map<String, Object> templateModel
    ) {
        return new TransactionalEmailRequest(to, null, null, templateAlias, templateModel);
    }

    public boolean isTemplate() {
        return templateAlias != null && !templateAlias.trim().isBlank();
    }
}

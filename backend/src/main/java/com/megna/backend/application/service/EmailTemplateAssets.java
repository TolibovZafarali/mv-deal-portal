package com.megna.backend.application.service;

import com.megna.backend.infrastructure.config.EmailProperties;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class EmailTemplateAssets {

    private final EmailProperties emailProperties;

    public String publicLogoUrl() {
        return emailProperties.resolvePublicLogoUrl();
    }

    public static String resolvePublicLogoUrl(EmailTemplateAssets assets) {
        if (assets == null) {
            return EmailProperties.DEFAULT_PUBLIC_LOGO_URL;
        }

        String url = assets.publicLogoUrl();
        if (url == null || url.isBlank()) {
            return EmailProperties.DEFAULT_PUBLIC_LOGO_URL;
        }

        return url.trim();
    }
}

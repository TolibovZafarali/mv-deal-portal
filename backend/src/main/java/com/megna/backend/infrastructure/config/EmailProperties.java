package com.megna.backend.infrastructure.config;

import lombok.Getter;
import lombok.Setter;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.List;

@Getter
@Setter
@Component
@ConfigurationProperties(prefix = "app.email")
public class EmailProperties {

    public static final String DEFAULT_PUBLIC_LOGO_URL = "https://megna.us/white-logo.png";

    private boolean enabled = false;
    private boolean production = false;
    private String fromAddress = "contact@megna.us";
    private String replyToAddress = "contact@megna.us";
    private String publicLogoUrl = DEFAULT_PUBLIC_LOGO_URL;
    private List<String> nonProductionAllowlist = new ArrayList<>();
    private boolean webhooksEnabled = false;
    private String webhookSecret = "";
    private String postmarkApiBaseUrl = "https://api.postmarkapp.com";
    private String postmarkServerToken = "";
    private String postmarkMessageStream = "";

    public String resolvePublicLogoUrl() {
        if (publicLogoUrl == null || publicLogoUrl.isBlank()) {
            return DEFAULT_PUBLIC_LOGO_URL;
        }
        return publicLogoUrl.trim();
    }
}

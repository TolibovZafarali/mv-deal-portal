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

    private boolean enabled = false;
    private boolean production = false;
    private String fromAddress = "no-reply@megna-realestate.com";
    private String replyToAddress = "contact@megna-realestate.com";
    private String inquiryNotificationTo = "contact@megna-realestate.com";
    private List<String> nonProductionAllowlist = new ArrayList<>();
    private String postmarkApiBaseUrl = "https://api.postmarkapp.com";
    private String postmarkServerToken = "";
    private String postmarkMessageStream = "";
}

package com.megna.backend.infrastructure.config;

import lombok.Getter;
import lombok.Setter;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

@Getter
@Setter
@Component
@ConfigurationProperties(prefix = "app.contact")
public class ContactProperties {

    private String generalInbox = "contact@megna.us";
    private String investorInbox = "contact@megna.us";
    private String sellerInbox = "contact@megna.us";
    private String privacyInbox = "privacy@megna.us";
}

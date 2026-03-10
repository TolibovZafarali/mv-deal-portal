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

    private String generalInbox = "contact@megna-realestate.com";
    private String investorInbox = "contact@megna-realestate.com";
    private String sellerInbox = "contact@megna-realestate.com";
    private String privacyInbox = "privacy@megna-realestate.com";
}

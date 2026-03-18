package com.megna.backend.infrastructure.config;

import lombok.Getter;
import lombok.Setter;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

@Getter
@Setter
@Component
@ConfigurationProperties(prefix = "app.auth")
public class AuthProperties {
    private String passwordResetUrlBase = "http://localhost:5173/reset-password";
    private long passwordResetTokenTtlMinutes = 30;
    private String invitationUrlBase = "http://localhost:5173/invite/accept";
    private long invitationTtlDays = 7;

    private long refreshTokenTtlMinutes = 20160;
    private String refreshCookieName = "mv_refresh_token";
    private String refreshCookieDomain = "";
    private String refreshCookiePath = "/api/auth";
    private boolean refreshCookieSecure = false;
    private String refreshCookieSameSite = "Lax";
}

package com.megna.backend.infrastructure.config;

import lombok.Getter;
import lombok.Setter;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

@Getter
@Setter
@Component
@ConfigurationProperties(prefix = "app.abuse-protection")
public class AbuseProtectionProperties {

    private boolean enabled = true;
    private long pruneIntervalSeconds = 60;
    private long staleEntryTtlSeconds = 7200;

    private EndpointLimit authLogin = new EndpointLimit(20, 60, 20);
    private EndpointLimit authRegister = new EndpointLimit(6, 600, 60);
    private EndpointLimit authRegisterSeller = new EndpointLimit(6, 600, 60);
    private EndpointLimit authPasswordForgot = new EndpointLimit(6, 600, 60);
    private EndpointLimit authPasswordReset = new EndpointLimit(12, 600, 45);
    private EndpointLimit authPasswordChange = new EndpointLimit(20, 300, 30);
    private EndpointLimit authRefresh = new EndpointLimit(120, 60, 0);
    private EndpointLimit authLogout = new EndpointLimit(120, 60, 0);
    private EndpointLimit inquiries = new EndpointLimit(24, 300, 30);
    private EndpointLimit contactRequests = new EndpointLimit(10, 600, 45);

    @Getter
    @Setter
    public static class EndpointLimit {
        private boolean enabled = true;
        private int maxRequests;
        private long windowSeconds;
        private int cooldownSeconds;
        private int cooldownTriggerDenials = 3;

        public EndpointLimit() {
        }

        public EndpointLimit(int maxRequests, long windowSeconds) {
            this.maxRequests = maxRequests;
            this.windowSeconds = windowSeconds;
        }

        public EndpointLimit(int maxRequests, long windowSeconds, int cooldownSeconds) {
            this.maxRequests = maxRequests;
            this.windowSeconds = windowSeconds;
            this.cooldownSeconds = cooldownSeconds;
        }
    }
}

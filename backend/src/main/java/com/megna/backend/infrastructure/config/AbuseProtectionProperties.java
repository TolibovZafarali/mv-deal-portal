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

    private EndpointLimit authLogin = new EndpointLimit(10, 300);
    private EndpointLimit authRegister = new EndpointLimit(5, 3600);
    private EndpointLimit authRegisterSeller = new EndpointLimit(5, 3600);
    private EndpointLimit authPasswordForgot = new EndpointLimit(5, 3600);
    private EndpointLimit authPasswordReset = new EndpointLimit(10, 600);
    private EndpointLimit authRefresh = new EndpointLimit(30, 300);
    private EndpointLimit authLogout = new EndpointLimit(30, 300);
    private EndpointLimit contactRequests = new EndpointLimit(5, 600);

    @Getter
    @Setter
    public static class EndpointLimit {
        private boolean enabled = true;
        private int maxRequests;
        private long windowSeconds;

        public EndpointLimit() {
        }

        public EndpointLimit(int maxRequests, long windowSeconds) {
            this.maxRequests = maxRequests;
            this.windowSeconds = windowSeconds;
        }
    }
}

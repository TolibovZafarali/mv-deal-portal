package com.megna.backend.infrastructure.config;

import com.megna.backend.infrastructure.security.PublicEndpointRateLimitInterceptor;
import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.InterceptorRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

@Configuration
@RequiredArgsConstructor
public class AbuseProtectionWebConfig implements WebMvcConfigurer {

    private final PublicEndpointRateLimitInterceptor publicEndpointRateLimitInterceptor;

    @Override
    public void addInterceptors(InterceptorRegistry registry) {
        registry.addInterceptor(publicEndpointRateLimitInterceptor)
                .addPathPatterns(
                        "/api/auth/login",
                        "/api/auth/register",
                        "/api/auth/register/seller",
                        "/api/auth/password/forgot",
                        "/api/auth/password/reset",
                        "/api/auth/refresh",
                        "/api/auth/logout",
                        "/api/contact-requests"
                );
    }
}

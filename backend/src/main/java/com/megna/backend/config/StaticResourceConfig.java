package com.megna.backend.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;
import org.springframework.util.StringUtils;
import org.springframework.web.servlet.config.annotation.ResourceHandlerRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

import java.nio.file.Path;
import java.nio.file.Paths;

@Configuration
public class StaticResourceConfig implements WebMvcConfigurer {

    @Value("${app.uploads.property-photos-dir:uploads/property-photos}")
    private String propertyPhotosDir;

    @Value("${app.uploads.property-photos-url-prefix:/uploads/property-photos}")
    private String propertyPhotosUrlPrefix;

    @Override
    public void addResourceHandlers(ResourceHandlerRegistry registry) {
        String urlPrefix = normalizeUrlPrefix(propertyPhotosUrlPrefix);
        String pattern = urlPrefix + "/**";

        Path resolvedDirectory = Paths.get(propertyPhotosDir).toAbsolutePath().normalize();
        String location = resolvedDirectory.toUri().toString();

        registry.addResourceHandler(pattern)
                .addResourceLocations(location.endsWith("/") ? location : location + "/");
    }

    private static String normalizeUrlPrefix(String rawPrefix) {
        String prefix = StringUtils.hasText(rawPrefix) ? rawPrefix.trim() : "/uploads/property-photos";

        if (!prefix.startsWith("/")) {
            prefix = "/" + prefix;
        }
        while (prefix.endsWith("/")) {
            prefix = prefix.substring(0, prefix.length() - 1);
        }
        return prefix;
    }
}

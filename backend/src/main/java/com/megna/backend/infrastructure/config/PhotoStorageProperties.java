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
@ConfigurationProperties(prefix = "app.photos")
public class PhotoStorageProperties {

    private String provider = "gcs";
    private String bucket = "";
    private String publicBaseUrl = "";
    private long maxFileSizeBytes = 10 * 1024 * 1024;
    private List<String> allowedContentTypes = new ArrayList<>(List.of("image/jpeg", "image/png", "image/webp"));
    private long uploadUrlTtlSeconds = 900;
    private int purgeGraceDays = 30;
    private int maxPurgeRetries = 5;
    private String purgeCron = "0 15 2 * * *";
}

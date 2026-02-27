package com.megna.backend.application.service.photo;

import java.time.Duration;
import java.util.Map;
import java.util.Optional;

public interface PhotoObjectStorage {

    String generateV4SignedPutUrl(
            String bucket,
            String objectKey,
            String contentType,
            Duration ttl,
            Map<String, String> requiredHeaders
    );

    Optional<StoredObjectMetadata> head(String bucket, String objectKey);

    byte[] download(String bucket, String objectKey);

    void upload(
            String bucket,
            String objectKey,
            byte[] bytes,
            String contentType,
            String cacheControl
    );

    void deleteIfExists(String bucket, String objectKey);

    record StoredObjectMetadata(String contentType, long sizeBytes) {}
}

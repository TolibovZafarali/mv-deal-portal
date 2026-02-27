package com.megna.backend.application.service.photo;

import com.google.cloud.storage.Blob;
import com.google.cloud.storage.BlobInfo;
import com.google.cloud.storage.HttpMethod;
import com.google.cloud.storage.Storage;
import com.google.cloud.storage.StorageOptions;
import org.springframework.stereotype.Component;

import java.net.URL;
import java.time.Duration;
import java.util.Map;
import java.util.Optional;
import java.util.concurrent.TimeUnit;

@Component
public class GcsPhotoObjectStorage implements PhotoObjectStorage {

    private final Storage storage;

    public GcsPhotoObjectStorage() {
        this.storage = StorageOptions.getDefaultInstance().getService();
    }

    @Override
    public String generateV4SignedPutUrl(
            String bucket,
            String objectKey,
            String contentType,
            Duration ttl,
            Map<String, String> requiredHeaders
    ) {
        BlobInfo blobInfo = BlobInfo.newBuilder(bucket, objectKey)
                .setContentType(contentType)
                .build();

        URL signedUrl = storage.signUrl(
                blobInfo,
                ttl.toSeconds(),
                TimeUnit.SECONDS,
                Storage.SignUrlOption.withV4Signature(),
                Storage.SignUrlOption.httpMethod(HttpMethod.PUT),
                Storage.SignUrlOption.withExtHeaders(requiredHeaders)
        );

        return signedUrl.toString();
    }

    @Override
    public Optional<StoredObjectMetadata> head(String bucket, String objectKey) {
        Blob blob = storage.get(bucket, objectKey);
        if (blob == null || !blob.exists()) {
            return Optional.empty();
        }

        String contentType = blob.getContentType();
        long size = blob.getSize();
        return Optional.of(new StoredObjectMetadata(contentType == null ? "" : contentType, size));
    }

    @Override
    public byte[] download(String bucket, String objectKey) {
        Blob blob = storage.get(bucket, objectKey);
        if (blob == null || !blob.exists()) {
            throw new IllegalStateException("Object not found: " + objectKey);
        }
        return blob.getContent();
    }

    @Override
    public void upload(
            String bucket,
            String objectKey,
            byte[] bytes,
            String contentType,
            String cacheControl
    ) {
        BlobInfo blobInfo = BlobInfo.newBuilder(bucket, objectKey)
                .setContentType(contentType)
                .setCacheControl(cacheControl)
                .build();

        storage.create(blobInfo, bytes);
    }

    @Override
    public void deleteIfExists(String bucket, String objectKey) {
        storage.delete(bucket, objectKey);
    }
}

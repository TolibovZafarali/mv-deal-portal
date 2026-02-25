package com.megna.backend.application.service;

import com.megna.backend.interfaces.rest.dto.property.PropertyPhotoUploadResponseDto;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.util.Locale;
import java.util.UUID;

@Service
public class PropertyPhotoStorageService {

    private final Path propertyPhotosDir;
    private final String propertyPhotosUrlPrefix;
    private final long maxFileSizeBytes;

    public PropertyPhotoStorageService(
            @Value("${app.uploads.property-photos-dir:uploads/property-photos}") String propertyPhotosDir,
            @Value("${app.uploads.property-photos-url-prefix:/uploads/property-photos}") String propertyPhotosUrlPrefix,
            @Value("${app.uploads.max-file-size-bytes:10485760}") long maxFileSizeBytes
    ) {
        this.propertyPhotosDir = Paths.get(propertyPhotosDir).toAbsolutePath().normalize();
        this.propertyPhotosUrlPrefix = normalizeUrlPrefix(propertyPhotosUrlPrefix);
        this.maxFileSizeBytes = maxFileSizeBytes;
    }

    public PropertyPhotoUploadResponseDto store(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Photo file is required");
        }

        if (file.getSize() > maxFileSizeBytes) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Photo exceeds maximum allowed size");
        }

        String contentType = StringUtils.hasText(file.getContentType())
                ? file.getContentType().toLowerCase(Locale.ROOT)
                : "";
        if (!contentType.startsWith("image/")) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Only image uploads are supported");
        }

        String extension = resolveExtension(file.getOriginalFilename(), contentType);
        String storedFileName = UUID.randomUUID() + extension;

        try {
            Files.createDirectories(propertyPhotosDir);
            Path target = propertyPhotosDir.resolve(storedFileName).normalize();
            if (!target.startsWith(propertyPhotosDir)) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid photo path");
            }

            try (var inputStream = file.getInputStream()) {
                Files.copy(inputStream, target, StandardCopyOption.REPLACE_EXISTING);
            }
        } catch (IOException ex) {
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Failed to store photo");
        }

        return new PropertyPhotoUploadResponseDto(propertyPhotosUrlPrefix + "/" + storedFileName);
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

    private static String resolveExtension(String originalFilename, String contentType) {
        String cleanName = StringUtils.cleanPath(originalFilename == null ? "" : originalFilename);
        int dot = cleanName.lastIndexOf('.');
        if (dot > -1 && dot < cleanName.length() - 1) {
            String ext = cleanName.substring(dot).toLowerCase(Locale.ROOT);
            if (ext.matches("\\.[a-z0-9]{1,10}")) {
                return ext;
            }
        }

        return switch (contentType) {
            case "image/png" -> ".png";
            case "image/webp" -> ".webp";
            case "image/gif" -> ".gif";
            case "image/bmp" -> ".bmp";
            case "image/heic" -> ".heic";
            case "image/heif" -> ".heif";
            default -> ".jpg";
        };
    }
}

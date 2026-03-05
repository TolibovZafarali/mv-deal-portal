package com.megna.backend.application.service;

import com.megna.backend.application.service.photo.PhotoObjectStorage;
import com.megna.backend.application.service.photo.PhotoUploadTokenService;
import com.megna.backend.domain.entity.PhotoAsset;
import com.megna.backend.domain.entity.PropertyPhoto;
import com.megna.backend.domain.enums.PhotoAssetPrincipalRole;
import com.megna.backend.domain.enums.PhotoAssetStatus;
import com.megna.backend.domain.repository.PhotoAssetRepository;
import com.megna.backend.domain.repository.PropertyPhotoRepository;
import com.megna.backend.infrastructure.config.PhotoStorageProperties;
import com.megna.backend.interfaces.rest.dto.property.PropertyPhotoUploadCompleteRequestDto;
import com.megna.backend.interfaces.rest.dto.property.PropertyPhotoUploadCompleteResponseDto;
import com.megna.backend.interfaces.rest.dto.property.PropertyPhotoUploadInitRequestDto;
import com.megna.backend.interfaces.rest.dto.property.PropertyPhotoUploadInitResponseDto;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;
import org.springframework.web.server.ResponseStatusException;

import javax.imageio.IIOImage;
import javax.imageio.ImageIO;
import javax.imageio.ImageWriteParam;
import javax.imageio.ImageWriter;
import javax.imageio.stream.ImageOutputStream;
import java.awt.AlphaComposite;
import java.awt.Graphics2D;
import java.awt.RenderingHints;
import java.awt.image.BufferedImage;
import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.net.URI;
import java.net.URISyntaxException;
import java.time.Duration;
import java.time.Instant;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.Collection;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.function.Consumer;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class PhotoAssetService {

    private static final DateTimeFormatter OBJECT_DATE_PREFIX = DateTimeFormatter.ofPattern("yyyy/MM");
    private static final int DISPLAY_MAX_EDGE = 1920;
    private static final int THUMB_MAX_EDGE = 400;

    private final PhotoAssetRepository photoAssetRepository;
    private final PropertyPhotoRepository propertyPhotoRepository;
    private final PhotoObjectStorage photoObjectStorage;
    private final PhotoStorageProperties photoStorageProperties;
    private final PhotoUploadTokenService photoUploadTokenService;

    @Transactional
    public PropertyPhotoUploadInitResponseDto initUpload(PropertyPhotoUploadInitRequestDto request, long adminId) {
        return initUpload(request, PhotoAssetPrincipalRole.ADMIN, adminId);
    }

    @Transactional
    public PropertyPhotoUploadInitResponseDto initUploadForSeller(PropertyPhotoUploadInitRequestDto request, long sellerId) {
        return initUpload(request, PhotoAssetPrincipalRole.SELLER, sellerId);
    }

    @Transactional
    public PropertyPhotoUploadInitResponseDto initUpload(
            PropertyPhotoUploadInitRequestDto request,
            PhotoAssetPrincipalRole principalRole,
            long principalId
    ) {
        validateStorageConfigured();

        String contentType = normalizeContentType(request.contentType());
        validateContentType(contentType);
        validateSize(request.sizeBytes());

        String uploadId = UUID.randomUUID().toString();
        String extension = resolveExtension(request.fileName(), contentType);
        LocalDateTime now = LocalDateTime.now();
        LocalDateTime expiresAt = now.plusSeconds(photoStorageProperties.getUploadUrlTtlSeconds());
        String datePrefix = now.format(OBJECT_DATE_PREFIX);

        String originalObjectKey = "original/" + datePrefix + "/" + uploadId + extension;
        String displayObjectKey = "display/" + datePrefix + "/" + uploadId + ".jpg";
        String thumbObjectKey = "thumb/" + datePrefix + "/" + uploadId + ".jpg";

        PhotoAsset asset = new PhotoAsset();
        asset.setId(uploadId);
        assignAssetOwner(asset, principalRole, principalId);
        asset.setStatus(PhotoAssetStatus.UPLOADING);
        asset.setOriginalBucket(photoStorageProperties.getBucket());
        asset.setOriginalObjectKey(originalObjectKey);
        asset.setDisplayObjectKey(displayObjectKey);
        asset.setThumbObjectKey(thumbObjectKey);
        asset.setOriginalContentType(contentType);
        asset.setOriginalSizeBytes(request.sizeBytes());
        asset.setExpiresAt(expiresAt);
        photoAssetRepository.save(asset);

        Map<String, String> requiredHeaders = Map.of("Content-Type", contentType);
        String signedUploadUrl = photoObjectStorage.generateV4SignedPutUrl(
                photoStorageProperties.getBucket(),
                originalObjectKey,
                contentType,
                Duration.ofSeconds(photoStorageProperties.getUploadUrlTtlSeconds()),
                requiredHeaders
        );

        String uploadToken = photoUploadTokenService.generate(
                uploadId,
                principalRole,
                principalId,
                expiresAt.toInstant(java.time.ZoneOffset.UTC)
        );

        return new PropertyPhotoUploadInitResponseDto(
                uploadId,
                signedUploadUrl,
                "PUT",
                requiredHeaders,
                expiresAt,
                uploadToken
        );
    }

    @Transactional
    public PropertyPhotoUploadCompleteResponseDto completeUpload(
            String uploadId,
            PropertyPhotoUploadCompleteRequestDto request,
            long adminId
    ) {
        return completeUpload(uploadId, request, PhotoAssetPrincipalRole.ADMIN, adminId);
    }

    @Transactional
    public PropertyPhotoUploadCompleteResponseDto completeUploadForSeller(
            String uploadId,
            PropertyPhotoUploadCompleteRequestDto request,
            long sellerId
    ) {
        return completeUpload(uploadId, request, PhotoAssetPrincipalRole.SELLER, sellerId);
    }

    @Transactional
    public PropertyPhotoUploadCompleteResponseDto completeUpload(
            String uploadId,
            PropertyPhotoUploadCompleteRequestDto request,
            PhotoAssetPrincipalRole principalRole,
            long principalId
    ) {
        validateStorageConfigured();

        PhotoUploadTokenService.UploadTokenClaims claims = photoUploadTokenService.parseAndValidate(request.uploadToken());
        if (!uploadId.equals(claims.uploadId())
                || claims.principalRole() != principalRole
                || principalId != claims.principalId()) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Upload token does not match request");
        }

        PhotoAsset asset = photoAssetRepository.findById(uploadId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Upload not found"));

        if (isAssetOwnedByAnotherPrincipal(asset, principalRole, principalId)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Upload belongs to another principal");
        }

        if (asset.getStatus() == PhotoAssetStatus.DELETED || asset.getStatus() == PhotoAssetStatus.DELETED_PENDING) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Upload is not available");
        }

        if (asset.getExpiresAt() != null && asset.getExpiresAt().isBefore(LocalDateTime.now())) {
            asset.setStatus(PhotoAssetStatus.FAILED);
            asset.setErrorMessage("Upload expired before completion");
            photoAssetRepository.save(asset);
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Upload expired before completion");
        }

        PhotoObjectStorage.StoredObjectMetadata metadata = photoObjectStorage.head(asset.getOriginalBucket(), asset.getOriginalObjectKey())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "Uploaded object not found"));

        String expectedType = normalizeContentType(asset.getOriginalContentType());
        String actualType = normalizeContentType(metadata.contentType());
        if (!expectedType.equals(actualType)) {
            failAsset(asset, "Uploaded content type does not match init request");
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Uploaded content type does not match init request");
        }

        if (asset.getOriginalSizeBytes() != null && asset.getOriginalSizeBytes() != metadata.sizeBytes()) {
            failAsset(asset, "Uploaded size does not match init request");
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Uploaded size does not match init request");
        }

        asset.setStatus(PhotoAssetStatus.PROCESSING);
        asset.setErrorMessage(null);
        photoAssetRepository.save(asset);

        try {
            byte[] originalBytes = photoObjectStorage.download(asset.getOriginalBucket(), asset.getOriginalObjectKey());
            ProcessedImage processed = processImage(originalBytes);

            photoObjectStorage.upload(
                    asset.getOriginalBucket(),
                    asset.getDisplayObjectKey(),
                    processed.displayBytes(),
                    "image/jpeg",
                    "public, max-age=31536000, immutable"
            );
            photoObjectStorage.upload(
                    asset.getOriginalBucket(),
                    asset.getThumbObjectKey(),
                    processed.thumbBytes(),
                    "image/jpeg",
                    "public, max-age=31536000, immutable"
            );

            asset.setUrl(buildPublicUrl(asset.getDisplayObjectKey()));
            asset.setThumbnailUrl(buildPublicUrl(asset.getThumbObjectKey()));
            asset.setDisplayWidth(processed.width());
            asset.setDisplayHeight(processed.height());
            asset.setStatus(PhotoAssetStatus.READY);
            asset.setErrorMessage(null);
            asset.setRetryCount(0);
            photoAssetRepository.save(asset);

            return new PropertyPhotoUploadCompleteResponseDto(
                    asset.getId(),
                    asset.getUrl(),
                    asset.getThumbnailUrl(),
                    asset.getDisplayWidth(),
                    asset.getDisplayHeight(),
                    "image/jpeg",
                    (long) processed.displayBytes().length
            );
        } catch (ResponseStatusException ex) {
            failAsset(asset, ex.getReason());
            throw ex;
        } catch (Exception ex) {
            failAsset(asset, "Failed to process upload");
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Failed to process upload");
        }
    }

    @Transactional
    public void deleteUnboundUpload(String uploadId, long adminId) {
        deleteUnboundUpload(uploadId, PhotoAssetPrincipalRole.ADMIN, adminId);
    }

    @Transactional
    public void deleteUnboundUploadForSeller(String uploadId, long sellerId) {
        deleteUnboundUpload(uploadId, PhotoAssetPrincipalRole.SELLER, sellerId);
    }

    @Transactional
    public void deleteUnboundUpload(String uploadId, PhotoAssetPrincipalRole principalRole, long principalId) {
        PhotoAsset asset = photoAssetRepository.findById(uploadId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Upload not found"));

        if (isAssetOwnedByAnotherPrincipal(asset, principalRole, principalId)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Upload belongs to another principal");
        }

        if (propertyPhotoRepository.existsByPhotoAssetId(uploadId)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Photo is already attached to a property");
        }

        hardDeleteAssetNow(asset);
    }

    @Transactional
    public PropertyPhotoUploadCompleteResponseDto createFromUrl(String rawUrl, long adminId) {
        return createFromUrl(rawUrl, PhotoAssetPrincipalRole.ADMIN, adminId);
    }

    @Transactional
    public PropertyPhotoUploadCompleteResponseDto createFromUrlForSeller(String rawUrl, long sellerId) {
        return createFromUrl(rawUrl, PhotoAssetPrincipalRole.SELLER, sellerId);
    }

    @Transactional
    public PropertyPhotoUploadCompleteResponseDto createFromUrl(
            String rawUrl,
            PhotoAssetPrincipalRole principalRole,
            long principalId
    ) {
        String normalizedUrl = normalizeExternalPhotoUrl(rawUrl);

        PhotoAsset asset = new PhotoAsset();
        asset.setId(UUID.randomUUID().toString());
        assignAssetOwner(asset, principalRole, principalId);
        asset.setStatus(PhotoAssetStatus.READY);
        asset.setUrl(normalizedUrl);
        asset.setThumbnailUrl(normalizedUrl);
        photoAssetRepository.save(asset);

        return new PropertyPhotoUploadCompleteResponseDto(
                asset.getId(),
                asset.getUrl(),
                asset.getThumbnailUrl(),
                null,
                null,
                null,
                null
        );
    }

    @Transactional(readOnly = true)
    public Map<String, PhotoAsset> resolveReadyAssetsOrThrow(
            Collection<String> assetIds,
            Long currentPropertyId,
            PhotoAssetPrincipalRole principalRole,
            long principalId
    ) {
        Set<String> uniqueIds = assetIds == null
                ? Set.of()
                : assetIds.stream().filter(StringUtils::hasText).collect(Collectors.toCollection(HashSet::new));

        if (uniqueIds.isEmpty()) {
            return Map.of();
        }

        List<PhotoAsset> assets = photoAssetRepository.findByIdIn(uniqueIds);
        if (assets.size() != uniqueIds.size()) {
            Set<String> foundIds = assets.stream().map(PhotoAsset::getId).collect(Collectors.toSet());
            String missing = uniqueIds.stream().filter(id -> !foundIds.contains(id)).findFirst().orElse("unknown");
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Photo asset not found: " + missing);
        }

        Map<String, PhotoAsset> byId = new HashMap<>();
        for (PhotoAsset asset : assets) {
            if (isAssetOwnedByAnotherPrincipal(asset, principalRole, principalId)) {
                throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Photo asset belongs to another principal: " + asset.getId());
            }
            if (asset.getStatus() != PhotoAssetStatus.READY) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Photo asset is not ready: " + asset.getId());
            }

            propertyPhotoRepository.findFirstByPhotoAssetId(asset.getId()).ifPresent(existing -> {
                Long existingPropertyId = existing.getProperty() != null ? existing.getProperty().getId() : null;
                if (existingPropertyId != null && !existingPropertyId.equals(currentPropertyId)) {
                    throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Photo asset already attached to another property: " + asset.getId());
                }
            });

            byId.put(asset.getId(), asset);
        }

        return byId;
    }

    @Transactional
    public void markDeletedPending(Collection<String> assetIds) {
        if (assetIds == null || assetIds.isEmpty()) {
            return;
        }

        List<PhotoAsset> assets = photoAssetRepository.findByIdIn(assetIds);
        if (assets.isEmpty()) {
            return;
        }

        LocalDateTime purgeAfter = LocalDateTime.now().plusDays(photoStorageProperties.getPurgeGraceDays());
        for (PhotoAsset asset : assets) {
            if (asset.getStatus() == PhotoAssetStatus.DELETED) {
                continue;
            }
            asset.setStatus(PhotoAssetStatus.DELETED_PENDING);
            asset.setPurgeAfterAt(purgeAfter);
            asset.setDeletedAt(null);
            asset.setErrorMessage(null);
        }

        photoAssetRepository.saveAll(assets);
    }

    @Scheduled(cron = "${app.photos.purge-cron:0 15 2 * * *}")
    @Transactional
    public void purgeDueAssets() {
        List<PhotoAsset> dueAssets = photoAssetRepository.findTop200ByStatusAndPurgeAfterAtLessThanEqual(
                PhotoAssetStatus.DELETED_PENDING,
                LocalDateTime.now()
        );

        if (dueAssets.isEmpty()) {
            return;
        }

        for (PhotoAsset asset : dueAssets) {
            try {
                safeDeleteObject(asset.getOriginalBucket(), asset.getOriginalObjectKey());
                safeDeleteObject(asset.getOriginalBucket(), asset.getDisplayObjectKey());
                safeDeleteObject(asset.getOriginalBucket(), asset.getThumbObjectKey());

                asset.setStatus(PhotoAssetStatus.DELETED);
                asset.setDeletedAt(LocalDateTime.now());
                asset.setErrorMessage(null);
            } catch (Exception ex) {
                int retry = asset.getRetryCount() + 1;
                asset.setRetryCount(retry);
                asset.setErrorMessage(truncate(ex.getMessage(), 500));
                if (retry >= photoStorageProperties.getMaxPurgeRetries()) {
                    asset.setStatus(PhotoAssetStatus.FAILED);
                }
            }
        }

        photoAssetRepository.saveAll(dueAssets);
    }

    private void safeDeleteObject(String bucket, String objectKey) {
        if (!StringUtils.hasText(bucket) || !StringUtils.hasText(objectKey)) {
            return;
        }
        photoObjectStorage.deleteIfExists(bucket, objectKey);
    }

    private void hardDeleteAssetNow(PhotoAsset asset) {
        if (asset.getStatus() == PhotoAssetStatus.DELETED) {
            return;
        }

        try {
            safeDeleteObject(asset.getOriginalBucket(), asset.getOriginalObjectKey());
            safeDeleteObject(asset.getOriginalBucket(), asset.getDisplayObjectKey());
            safeDeleteObject(asset.getOriginalBucket(), asset.getThumbObjectKey());

            asset.setStatus(PhotoAssetStatus.DELETED);
            asset.setDeletedAt(LocalDateTime.now());
            asset.setPurgeAfterAt(null);
            asset.setErrorMessage(null);
            asset.setRetryCount(0);
            photoAssetRepository.save(asset);
        } catch (Exception ex) {
            asset.setStatus(PhotoAssetStatus.FAILED);
            asset.setErrorMessage(truncate(ex.getMessage(), 500));
            photoAssetRepository.save(asset);
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Failed to delete staged upload");
        }
    }

    private void failAsset(PhotoAsset asset, String message) {
        asset.setStatus(PhotoAssetStatus.FAILED);
        asset.setErrorMessage(truncate(message, 500));
        photoAssetRepository.save(asset);
    }

    private static String truncate(String value, int max) {
        if (!StringUtils.hasText(value) || value.length() <= max) {
            return value;
        }
        return value.substring(0, max);
    }

    private String normalizeExternalPhotoUrl(String rawUrl) {
        if (!StringUtils.hasText(rawUrl)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Photo URL is required");
        }

        String trimmed = rawUrl.trim();
        final URI uri;
        try {
            uri = new URI(trimmed);
        } catch (URISyntaxException ex) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Photo URL is invalid");
        }

        String scheme = uri.getScheme();
        if (!StringUtils.hasText(scheme)
                || (!"http".equalsIgnoreCase(scheme) && !"https".equalsIgnoreCase(scheme))) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Photo URL must use http or https");
        }

        if (!uri.isAbsolute() || !StringUtils.hasText(uri.getHost())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Photo URL is invalid");
        }

        return uri.toString();
    }

    private void assignAssetOwner(PhotoAsset asset, PhotoAssetPrincipalRole principalRole, long principalId) {
        if (principalRole == PhotoAssetPrincipalRole.ADMIN) {
            asset.setCreatedByAdminId(principalId);
            asset.setCreatedBySellerId(null);
            return;
        }
        asset.setCreatedBySellerId(principalId);
        asset.setCreatedByAdminId(null);
    }

    private boolean isAssetOwnedByAnotherPrincipal(
            PhotoAsset asset,
            PhotoAssetPrincipalRole principalRole,
            long principalId
    ) {
        Long ownerAdminId = asset.getCreatedByAdminId();
        Long ownerSellerId = asset.getCreatedBySellerId();

        if (ownerAdminId == null && ownerSellerId == null) {
            return false;
        }

        if (principalRole == PhotoAssetPrincipalRole.ADMIN) {
            return ownerAdminId == null || ownerAdminId != principalId;
        }

        return ownerSellerId == null || ownerSellerId != principalId;
    }

    private void validateStorageConfigured() {
        if (!"gcs".equalsIgnoreCase(photoStorageProperties.getProvider())) {
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Unsupported photo provider");
        }

        if (!StringUtils.hasText(photoStorageProperties.getBucket())) {
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Photo bucket is not configured");
        }

        if (!StringUtils.hasText(photoStorageProperties.getPublicBaseUrl())) {
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Photo public base URL is not configured");
        }
    }

    private void validateSize(Long sizeBytes) {
        if (sizeBytes == null || sizeBytes <= 0) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Photo file size is required");
        }

        if (sizeBytes > photoStorageProperties.getMaxFileSizeBytes()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Photo exceeds maximum allowed size");
        }
    }

    private void validateContentType(String contentType) {
        List<String> configuredAllowedTypes = photoStorageProperties.getAllowedContentTypes();
        if (configuredAllowedTypes == null || configuredAllowedTypes.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "No allowed photo content types configured");
        }

        Set<String> allowed = configuredAllowedTypes.stream()
                .filter(StringUtils::hasText)
                .map(this::normalizeContentType)
                .collect(Collectors.toSet());

        if (!allowed.contains(contentType)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Unsupported image format");
        }
    }

    private String normalizeContentType(String contentType) {
        return StringUtils.hasText(contentType)
                ? contentType.trim().toLowerCase(Locale.ROOT)
                : "";
    }

    private String resolveExtension(String fileName, String contentType) {
        String normalized = StringUtils.cleanPath(fileName == null ? "" : fileName);
        int dot = normalized.lastIndexOf('.');
        if (dot > -1 && dot < normalized.length() - 1) {
            String ext = normalized.substring(dot).toLowerCase(Locale.ROOT);
            if (ext.matches("\\.[a-z0-9]{1,10}")) {
                return ext;
            }
        }

        return switch (contentType) {
            case "image/png" -> ".png";
            case "image/webp" -> ".webp";
            default -> ".jpg";
        };
    }

    private String buildPublicUrl(String objectKey) {
        String base = photoStorageProperties.getPublicBaseUrl().trim();
        if (base.endsWith("/")) {
            base = base.substring(0, base.length() - 1);
        }
        return base + "/" + objectKey;
    }

    private ProcessedImage processImage(byte[] bytes) {
        try {
            BufferedImage source = ImageIO.read(new ByteArrayInputStream(bytes));
            if (source == null) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Could not decode uploaded image");
            }

            BufferedImage display = resizePreservingAspect(source, DISPLAY_MAX_EDGE);
            BufferedImage thumb = resizePreservingAspect(source, THUMB_MAX_EDGE);

            byte[] displayBytes = writeJpeg(display, 0.88f);
            byte[] thumbBytes = writeJpeg(thumb, 0.82f);

            return new ProcessedImage(displayBytes, thumbBytes, display.getWidth(), display.getHeight());
        } catch (IOException ex) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Could not process uploaded image");
        }
    }

    private BufferedImage resizePreservingAspect(BufferedImage source, int maxLongEdge) {
        int width = source.getWidth();
        int height = source.getHeight();
        int longEdge = Math.max(width, height);

        if (longEdge <= maxLongEdge) {
            return toRgb(source);
        }

        double scale = (double) maxLongEdge / (double) longEdge;
        int targetWidth = Math.max(1, (int) Math.round(width * scale));
        int targetHeight = Math.max(1, (int) Math.round(height * scale));

        BufferedImage target = new BufferedImage(targetWidth, targetHeight, BufferedImage.TYPE_INT_RGB);
        Graphics2D graphics = target.createGraphics();
        try {
            graphics.setComposite(AlphaComposite.Src);
            graphics.setRenderingHint(RenderingHints.KEY_INTERPOLATION, RenderingHints.VALUE_INTERPOLATION_BICUBIC);
            graphics.setRenderingHint(RenderingHints.KEY_RENDERING, RenderingHints.VALUE_RENDER_QUALITY);
            graphics.setRenderingHint(RenderingHints.KEY_ANTIALIASING, RenderingHints.VALUE_ANTIALIAS_ON);
            graphics.drawImage(source, 0, 0, targetWidth, targetHeight, null);
        } finally {
            graphics.dispose();
        }

        return target;
    }

    private BufferedImage toRgb(BufferedImage source) {
        if (source.getType() == BufferedImage.TYPE_INT_RGB) {
            return source;
        }

        BufferedImage target = new BufferedImage(source.getWidth(), source.getHeight(), BufferedImage.TYPE_INT_RGB);
        Graphics2D graphics = target.createGraphics();
        try {
            graphics.drawImage(source, 0, 0, null);
        } finally {
            graphics.dispose();
        }

        return target;
    }

    private byte[] writeJpeg(BufferedImage image, float quality) throws IOException {
        ImageWriter writer = ImageIO.getImageWritersByFormatName("jpg")
                .next();

        ByteArrayOutputStream output = new ByteArrayOutputStream();
        try (ImageOutputStream imageOutputStream = ImageIO.createImageOutputStream(output)) {
            writer.setOutput(imageOutputStream);
            ImageWriteParam params = writer.getDefaultWriteParam();
            if (params.canWriteCompressed()) {
                params.setCompressionMode(ImageWriteParam.MODE_EXPLICIT);
                params.setCompressionQuality(quality);
            }
            writer.write(null, new IIOImage(image, null, null), params);
        } finally {
            writer.dispose();
        }

        return output.toByteArray();
    }

    public void applyAssetUrlsToPhotos(List<PropertyPhoto> photos, Map<String, PhotoAsset> assetById) {
        if (photos == null || photos.isEmpty()) {
            return;
        }

        for (PropertyPhoto photo : photos) {
            if (photo == null) {
                continue;
            }
            PhotoAsset asset = assetById.get(photo.getPhotoAssetId());
            if (asset == null) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Photo asset not found: " + photo.getPhotoAssetId());
            }
            photo.setUrl(asset.getUrl());
            photo.setThumbnailUrl(asset.getThumbnailUrl());
        }
    }

    public List<String> collectPhotoAssetIds(List<PropertyPhoto> photos) {
        if (photos == null || photos.isEmpty()) {
            return List.of();
        }

        return photos.stream()
                .map(PropertyPhoto::getPhotoAssetId)
                .filter(StringUtils::hasText)
                .toList();
    }

    public void forEachRemovedAsset(List<String> originalAssetIds, List<String> newAssetIds, Consumer<List<String>> consumer) {
        if (originalAssetIds == null || originalAssetIds.isEmpty()) {
            return;
        }

        Set<String> next = new HashSet<>(newAssetIds == null ? List.of() : newAssetIds);
        List<String> removed = originalAssetIds.stream()
                .filter(id -> !next.contains(id))
                .toList();

        if (!removed.isEmpty()) {
            consumer.accept(removed);
        }
    }

    private record ProcessedImage(byte[] displayBytes, byte[] thumbBytes, int width, int height) {
    }
}

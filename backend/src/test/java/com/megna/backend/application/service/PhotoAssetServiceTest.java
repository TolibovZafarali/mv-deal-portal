package com.megna.backend.application.service;

import com.megna.backend.application.service.photo.PhotoObjectStorage;
import com.megna.backend.application.service.photo.PhotoUploadTokenService;
import com.megna.backend.domain.entity.PhotoAsset;
import com.megna.backend.domain.entity.Property;
import com.megna.backend.domain.entity.PropertyPhoto;
import com.megna.backend.domain.enums.PhotoAssetPrincipalRole;
import com.megna.backend.domain.enums.PhotoAssetStatus;
import com.megna.backend.domain.repository.PhotoAssetRepository;
import com.megna.backend.domain.repository.PropertyPhotoRepository;
import com.megna.backend.infrastructure.config.PhotoStorageProperties;
import com.megna.backend.interfaces.rest.dto.property.PropertyPhotoUploadCompleteRequestDto;
import com.megna.backend.interfaces.rest.dto.property.PropertyPhotoUploadCompleteResponseDto;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import java.util.concurrent.Executor;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.argThat;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class PhotoAssetServiceTest {

    @Mock
    private PhotoAssetRepository photoAssetRepository;

    @Mock
    private PropertyPhotoRepository propertyPhotoRepository;

    @Mock
    private PhotoObjectStorage photoObjectStorage;

    @Mock
    private PhotoStorageProperties photoStorageProperties;

    @Mock
    private PhotoUploadTokenService photoUploadTokenService;

    @Mock
    private Executor photoProcessingExecutor;

    @InjectMocks
    private PhotoAssetService photoAssetService;

    @Test
    void createFromUrlCreatesReadyAssetOwnedByAdmin() {
        when(photoAssetRepository.save(any(PhotoAsset.class))).thenAnswer(invocation -> invocation.getArgument(0));

        PropertyPhotoUploadCompleteResponseDto response = photoAssetService.createFromUrl(" https://example.com/photo.jpg ", 77L);

        ArgumentCaptor<PhotoAsset> assetCaptor = ArgumentCaptor.forClass(PhotoAsset.class);
        verify(photoAssetRepository).save(assetCaptor.capture());
        PhotoAsset saved = assetCaptor.getValue();

        assertNotNull(saved.getId());
        assertEquals(36, saved.getId().length());
        assertEquals(UUID.fromString(saved.getId()).toString(), saved.getId());
        assertEquals(77L, saved.getCreatedByAdminId());
        assertEquals(PhotoAssetStatus.READY, saved.getStatus());
        assertEquals("https://example.com/photo.jpg", saved.getUrl());
        assertEquals("https://example.com/photo.jpg", saved.getThumbnailUrl());

        assertEquals(saved.getId(), response.photoAssetId());
        assertEquals(saved.getUrl(), response.url());
        assertEquals(saved.getThumbnailUrl(), response.thumbnailUrl());
        assertNull(response.width());
        assertNull(response.height());
        assertNull(response.contentType());
        assertNull(response.sizeBytes());
    }

    @Test
    void createFromUrlRejectsBlankUrl() {
        ResponseStatusException ex = assertThrows(ResponseStatusException.class, () ->
                photoAssetService.createFromUrl("   ", 7L)
        );

        assertEquals(HttpStatus.BAD_REQUEST, ex.getStatusCode());
        assertEquals("Photo URL is required", ex.getReason());
    }

    @Test
    void createFromUrlRejectsInvalidUrl() {
        ResponseStatusException ex = assertThrows(ResponseStatusException.class, () ->
                photoAssetService.createFromUrl("https://example .com/photo.jpg", 7L)
        );

        assertEquals(HttpStatus.BAD_REQUEST, ex.getStatusCode());
        assertEquals("Photo URL is invalid", ex.getReason());
    }

    @Test
    void createFromUrlRejectsUnsupportedScheme() {
        ResponseStatusException ex = assertThrows(ResponseStatusException.class, () ->
                photoAssetService.createFromUrl("ftp://example.com/photo.jpg", 7L)
        );

        assertEquals(HttpStatus.BAD_REQUEST, ex.getStatusCode());
        assertEquals("Photo URL must use http or https", ex.getReason());
    }

    @Test
    void resolveReadyAssetsAllowsExistingAssetAttachedToCurrentProperty() {
        PhotoAsset asset = new PhotoAsset();
        asset.setId("asset-1");
        asset.setCreatedBySellerId(42L);
        asset.setStatus(PhotoAssetStatus.READY);
        asset.setUrl("https://example.com/asset-1.jpg");

        Property property = new Property();
        property.setId(9L);

        PropertyPhoto propertyPhoto = new PropertyPhoto();
        propertyPhoto.setProperty(property);
        propertyPhoto.setPhotoAssetId(asset.getId());

        when(photoAssetRepository.findByIdIn(argThat(ids -> ids != null && ids.size() == 1 && ids.contains(asset.getId()))))
                .thenReturn(List.of(asset));
        when(propertyPhotoRepository.findFirstByPhotoAssetId(asset.getId())).thenReturn(Optional.of(propertyPhoto));

        Map<String, PhotoAsset> resolved = photoAssetService.resolveReadyAssetsOrThrow(
                List.of(asset.getId()),
                9L,
                PhotoAssetPrincipalRole.ADMIN,
                77L
        );

        assertEquals(asset, resolved.get(asset.getId()));
    }

    @Test
    void resolveReadyAssetsRejectsAssetOwnedByAnotherPrincipalWhenUnbound() {
        PhotoAsset asset = new PhotoAsset();
        asset.setId("asset-2");
        asset.setCreatedBySellerId(42L);
        asset.setStatus(PhotoAssetStatus.READY);

        when(photoAssetRepository.findByIdIn(argThat(ids -> ids != null && ids.size() == 1 && ids.contains(asset.getId()))))
                .thenReturn(List.of(asset));
        when(propertyPhotoRepository.findFirstByPhotoAssetId(asset.getId())).thenReturn(Optional.empty());

        ResponseStatusException ex = assertThrows(ResponseStatusException.class, () ->
                photoAssetService.resolveReadyAssetsOrThrow(
                        List.of(asset.getId()),
                        9L,
                        PhotoAssetPrincipalRole.ADMIN,
                        77L
                )
        );

        assertEquals(HttpStatus.FORBIDDEN, ex.getStatusCode());
        assertEquals("Photo asset belongs to another principal: asset-2", ex.getReason());
    }

    @Test
    void resolveReadyAssetsRejectsReadyAssetWithMissingUrl() {
        PhotoAsset asset = new PhotoAsset();
        asset.setId("asset-3");
        asset.setCreatedByAdminId(77L);
        asset.setStatus(PhotoAssetStatus.READY);
        asset.setUrl(null);

        when(photoAssetRepository.findByIdIn(argThat(ids -> ids != null && ids.size() == 1 && ids.contains(asset.getId()))))
                .thenReturn(List.of(asset));
        when(propertyPhotoRepository.findFirstByPhotoAssetId(asset.getId())).thenReturn(Optional.empty());

        ResponseStatusException ex = assertThrows(ResponseStatusException.class, () ->
                photoAssetService.resolveReadyAssetsOrThrow(
                        List.of(asset.getId()),
                        9L,
                        PhotoAssetPrincipalRole.ADMIN,
                        77L
                )
        );

        assertEquals(HttpStatus.BAD_REQUEST, ex.getStatusCode());
        assertEquals("Photo asset is missing URL: asset-3", ex.getReason());
    }

    @Test
    void completeUploadReturnsBadGatewayAndMarksFailedWhenMetadataLookupBlowsUp() {
        PhotoAsset asset = new PhotoAsset();
        asset.setId("upload-1");
        asset.setStatus(PhotoAssetStatus.UPLOADING);
        asset.setOriginalBucket("mv-photos-prod");
        asset.setOriginalObjectKey("original/2026/03/upload-1.jpg");
        asset.setDisplayObjectKey("display/2026/03/upload-1.jpg");
        asset.setThumbObjectKey("thumb/2026/03/upload-1.jpg");
        asset.setOriginalContentType("image/jpeg");
        asset.setOriginalSizeBytes(1234L);
        asset.setCreatedByAdminId(99L);
        asset.setExpiresAt(LocalDateTime.now().plusMinutes(5));

        when(photoStorageProperties.getProvider()).thenReturn("gcs");
        when(photoStorageProperties.getBucket()).thenReturn("mv-photos-prod");
        when(photoStorageProperties.getPublicBaseUrl()).thenReturn("https://storage.googleapis.com/mv-photos-prod");

        when(photoUploadTokenService.parseAndValidate("token"))
                .thenReturn(new PhotoUploadTokenService.UploadTokenClaims("upload-1", PhotoAssetPrincipalRole.ADMIN, 99L));
        when(photoAssetRepository.findById("upload-1")).thenReturn(Optional.of(asset));
        when(photoAssetRepository.save(any(PhotoAsset.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(photoObjectStorage.head("mv-photos-prod", "original/2026/03/upload-1.jpg"))
                .thenThrow(new RuntimeException("storage permission denied"));

        ResponseStatusException ex = assertThrows(ResponseStatusException.class, () ->
                photoAssetService.completeUpload(
                        "upload-1",
                        new PropertyPhotoUploadCompleteRequestDto("token"),
                        99L
                )
        );

        assertEquals(HttpStatus.BAD_GATEWAY, ex.getStatusCode());
        assertEquals("Photo storage metadata lookup failed", ex.getReason());
        assertEquals(PhotoAssetStatus.FAILED, asset.getStatus());
        assertEquals("Photo storage metadata lookup failed", asset.getErrorMessage());
    }
}

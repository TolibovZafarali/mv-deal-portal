package com.megna.backend.domain.entity;

import com.megna.backend.domain.enums.PhotoAssetStatus;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;

@Getter
@Setter
@NoArgsConstructor
@Entity
@Table(name = "photo_assets")
public class PhotoAsset {

    @Id
    @Column(name = "id", nullable = false, length = 36)
    private String id;

    @Column(name = "created_by_admin_id")
    private Long createdByAdminId;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 20)
    private PhotoAssetStatus status;

    @Column(name = "original_bucket", length = 255)
    private String originalBucket;

    @Column(name = "original_object_key", length = 512)
    private String originalObjectKey;

    @Column(name = "display_object_key", length = 512)
    private String displayObjectKey;

    @Column(name = "thumb_object_key", length = 512)
    private String thumbObjectKey;

    @Column(name = "url", columnDefinition = "TEXT")
    private String url;

    @Column(name = "thumbnail_url", columnDefinition = "TEXT")
    private String thumbnailUrl;

    @Column(name = "original_content_type", length = 100)
    private String originalContentType;

    @Column(name = "original_size_bytes")
    private Long originalSizeBytes;

    @Column(name = "display_width")
    private Integer displayWidth;

    @Column(name = "display_height")
    private Integer displayHeight;

    @Column(name = "error_message", length = 500)
    private String errorMessage;

    @Column(name = "expires_at")
    private LocalDateTime expiresAt;

    @Column(name = "purge_after_at")
    private LocalDateTime purgeAfterAt;

    @Column(name = "deleted_at")
    private LocalDateTime deletedAt;

    @Column(name = "retry_count", nullable = false)
    private int retryCount = 0;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    @PrePersist
    void prePersist() {
        LocalDateTime now = LocalDateTime.now();
        this.createdAt = now;
        this.updatedAt = now;
    }

    @PreUpdate
    void preUpdate() {
        this.updatedAt = LocalDateTime.now();
    }
}

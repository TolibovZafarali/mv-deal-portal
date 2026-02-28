CREATE TABLE IF NOT EXISTS photo_assets (
    id CHAR(36) NOT NULL,
    created_by_admin_id BIGINT UNSIGNED NULL,
    status VARCHAR(20) NOT NULL,

    original_bucket VARCHAR(255) NULL,
    original_object_key VARCHAR(512) NULL,
    display_object_key VARCHAR(512) NULL,
    thumb_object_key VARCHAR(512) NULL,

    url TEXT NULL,
    thumbnail_url TEXT NULL,

    original_content_type VARCHAR(100) NULL,
    original_size_bytes BIGINT NULL,

    display_width INT NULL,
    display_height INT NULL,

    error_message VARCHAR(500) NULL,
    expires_at DATETIME NULL,
    purge_after_at DATETIME NULL,
    deleted_at DATETIME NULL,
    retry_count INT NOT NULL DEFAULT 0,

    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    PRIMARY KEY (id),
    KEY idx_photo_assets_status_purge (status, purge_after_at),
    KEY idx_photo_assets_admin (created_by_admin_id),
    CONSTRAINT fk_photo_assets_admin
        FOREIGN KEY (created_by_admin_id) REFERENCES admins(id)
        ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

ALTER TABLE property_photos
    ADD COLUMN thumbnail_url TEXT NULL,
    ADD COLUMN photo_asset_id CHAR(36) NULL;

CREATE TEMPORARY TABLE tmp_photo_asset_map (
    photo_id BIGINT UNSIGNED NOT NULL PRIMARY KEY,
    asset_id CHAR(36) NOT NULL
);

INSERT INTO tmp_photo_asset_map (photo_id, asset_id)
SELECT pp.id, UUID()
FROM property_photos pp
WHERE pp.photo_asset_id IS NULL
  AND pp.url IS NOT NULL
  AND pp.url NOT LIKE '/uploads/%';

INSERT INTO photo_assets (
    id,
    created_by_admin_id,
    status,
    original_bucket,
    original_object_key,
    display_object_key,
    thumb_object_key,
    url,
    thumbnail_url,
    original_content_type,
    original_size_bytes,
    display_width,
    display_height,
    error_message,
    expires_at,
    purge_after_at,
    deleted_at,
    retry_count,
    created_at,
    updated_at
)
SELECT
    m.asset_id,
    NULL,
    'READY',
    NULL,
    NULL,
    NULL,
    NULL,
    pp.url,
    COALESCE(pp.thumbnail_url, pp.url),
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    0,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
FROM property_photos pp
JOIN tmp_photo_asset_map m ON m.photo_id = pp.id;

UPDATE property_photos pp
JOIN tmp_photo_asset_map m ON m.photo_id = pp.id
SET pp.photo_asset_id = m.asset_id,
    pp.thumbnail_url = COALESCE(pp.thumbnail_url, pp.url);

DROP TEMPORARY TABLE tmp_photo_asset_map;

DELETE FROM property_photos
WHERE url LIKE '/uploads/%';

DELETE FROM property_photos
WHERE photo_asset_id IS NULL;

UPDATE properties p
SET p.status = 'DRAFT'
WHERE p.status = 'ACTIVE'
  AND NOT EXISTS (
      SELECT 1
      FROM property_photos pp
      WHERE pp.property_id = p.id
  );

ALTER TABLE property_photos
    MODIFY photo_asset_id CHAR(36) NOT NULL,
    ADD CONSTRAINT fk_property_photos_photo_asset
        FOREIGN KEY (photo_asset_id) REFERENCES photo_assets(id)
        ON DELETE RESTRICT,
    ADD CONSTRAINT uk_property_photo_asset
        UNIQUE (property_id, photo_asset_id);

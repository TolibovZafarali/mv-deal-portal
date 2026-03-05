ALTER TABLE photo_assets
    ADD COLUMN created_by_seller_id BIGINT UNSIGNED NULL AFTER created_by_admin_id,
    ADD INDEX idx_photo_assets_seller (created_by_seller_id),
    ADD CONSTRAINT fk_photo_assets_seller
        FOREIGN KEY (created_by_seller_id) REFERENCES sellers(id)
        ON DELETE SET NULL;

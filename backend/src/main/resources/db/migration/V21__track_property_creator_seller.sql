ALTER TABLE properties
    ADD COLUMN created_by_seller_id BIGINT UNSIGNED NULL AFTER seller_id,
    ADD INDEX idx_properties_created_by_seller (created_by_seller_id),
    ADD CONSTRAINT fk_properties_created_by_seller
        FOREIGN KEY (created_by_seller_id) REFERENCES sellers(id);

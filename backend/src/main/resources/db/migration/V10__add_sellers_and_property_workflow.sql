CREATE TABLE IF NOT EXISTS sellers (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,

    first_name VARCHAR(80) NOT NULL,
    last_name VARCHAR(80) NOT NULL,
    company_name VARCHAR(120) NOT NULL,
    email VARCHAR(255) NOT NULL,
    phone VARCHAR(30) NOT NULL,

    password_hash VARCHAR(255) NOT NULL,

    status VARCHAR(20) NOT NULL,

    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    PRIMARY KEY (id),
    UNIQUE KEY uk_sellers_email (email),
    KEY idx_sellers_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

ALTER TABLE properties
    ADD COLUMN seller_id BIGINT UNSIGNED NULL,
    ADD COLUMN seller_workflow_status VARCHAR(30) NULL,
    ADD COLUMN seller_review_note TEXT NULL,
    ADD COLUMN submitted_at DATETIME NULL,
    ADD COLUMN reviewed_at DATETIME NULL,
    ADD COLUMN published_at DATETIME NULL,
    ADD INDEX idx_properties_seller_workflow (seller_id, seller_workflow_status),
    ADD CONSTRAINT fk_properties_seller
        FOREIGN KEY (seller_id) REFERENCES sellers(id)
        ON DELETE SET NULL;

CREATE TABLE IF NOT EXISTS property_change_requests (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    property_id BIGINT UNSIGNED NOT NULL,
    seller_id BIGINT UNSIGNED NOT NULL,

    requested_changes TEXT NOT NULL,
    status VARCHAR(20) NOT NULL,
    admin_note TEXT NULL,

    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    resolved_at DATETIME NULL,
    resolved_by_admin_id BIGINT UNSIGNED NULL,

    PRIMARY KEY (id),
    KEY idx_pcr_property_status (property_id, status),
    KEY idx_pcr_seller_status (seller_id, status),
    KEY idx_pcr_resolved_by_admin (resolved_by_admin_id),
    CONSTRAINT fk_pcr_property
        FOREIGN KEY (property_id) REFERENCES properties(id)
        ON DELETE CASCADE,
    CONSTRAINT fk_pcr_seller
        FOREIGN KEY (seller_id) REFERENCES sellers(id)
        ON DELETE CASCADE,
    CONSTRAINT fk_pcr_admin
        FOREIGN KEY (resolved_by_admin_id) REFERENCES admins(id)
        ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

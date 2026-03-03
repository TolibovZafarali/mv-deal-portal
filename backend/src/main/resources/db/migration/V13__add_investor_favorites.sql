CREATE TABLE IF NOT EXISTS investor_favorites (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    investor_id BIGINT UNSIGNED NOT NULL,
    property_id BIGINT UNSIGNED NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY (id),
    UNIQUE KEY uk_investor_favorites_investor_property (investor_id, property_id),
    KEY idx_investor_favorites_investor (investor_id),
    KEY idx_investor_favorites_property (property_id),
    KEY idx_investor_favorites_created_at (created_at),
    CONSTRAINT fk_investor_favorites_investor
        FOREIGN KEY (investor_id) REFERENCES investors(id)
        ON DELETE CASCADE,
    CONSTRAINT fk_investor_favorites_property
        FOREIGN KEY (property_id) REFERENCES properties(id)
        ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

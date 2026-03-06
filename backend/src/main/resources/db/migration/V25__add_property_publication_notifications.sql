ALTER TABLE properties
    ADD COLUMN investor_notification_enqueued_at DATETIME NULL AFTER published_at;

CREATE TABLE IF NOT EXISTS property_publication_notifications (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    property_id BIGINT UNSIGNED NOT NULL,
    investor_id BIGINT UNSIGNED NOT NULL,
    recipient_email VARCHAR(255) NOT NULL,
    status VARCHAR(20) NOT NULL,
    attempt_count INT NOT NULL DEFAULT 0,
    next_attempt_at DATETIME NULL,
    sent_at DATETIME NULL,
    last_error VARCHAR(500) NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uk_property_publication_notifications_property_investor (property_id, investor_id),
    KEY idx_property_publication_notifications_status_next_attempt (status, next_attempt_at),
    KEY idx_property_publication_notifications_property (property_id),
    KEY idx_property_publication_notifications_investor (investor_id),
    CONSTRAINT fk_property_publication_notifications_property
        FOREIGN KEY (property_id) REFERENCES properties(id)
            ON DELETE CASCADE,
    CONSTRAINT fk_property_publication_notifications_investor
        FOREIGN KEY (investor_id) REFERENCES investors(id)
            ON DELETE CASCADE
);

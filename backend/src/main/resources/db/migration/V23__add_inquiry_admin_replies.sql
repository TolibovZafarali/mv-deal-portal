CREATE TABLE IF NOT EXISTS inquiry_admin_replies (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    investor_id BIGINT UNSIGNED NOT NULL,
    property_id BIGINT UNSIGNED NOT NULL,
    admin_id BIGINT UNSIGNED NOT NULL,
    message_body TEXT NOT NULL,
    email_status VARCHAR(20) NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY (id),

    CONSTRAINT fk_inquiry_admin_replies_investor
        FOREIGN KEY (investor_id) REFERENCES investors(id)
        ON DELETE CASCADE,

    CONSTRAINT fk_inquiry_admin_replies_property
        FOREIGN KEY (property_id) REFERENCES properties(id)
        ON DELETE CASCADE,

    CONSTRAINT fk_inquiry_admin_replies_admin
        FOREIGN KEY (admin_id) REFERENCES admins(id)
        ON DELETE CASCADE,

    KEY idx_inquiry_admin_replies_thread (investor_id, property_id, created_at),
    KEY idx_inquiry_admin_replies_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

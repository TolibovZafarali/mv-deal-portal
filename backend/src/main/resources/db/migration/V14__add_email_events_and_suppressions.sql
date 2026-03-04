CREATE TABLE IF NOT EXISTS email_events (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    record_type VARCHAR(50) NOT NULL,
    recipient_email VARCHAR(255) NULL,
    postmark_message_id VARCHAR(120) NULL,
    postmark_message_stream VARCHAR(120) NULL,
    occurred_at DATETIME NULL,
    raw_payload LONGTEXT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY (id),
    KEY idx_email_events_record_type_created_at (record_type, created_at),
    KEY idx_email_events_recipient_email (recipient_email),
    KEY idx_email_events_postmark_message_id (postmark_message_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS email_suppressions (
    email VARCHAR(255) NOT NULL,
    suppression_reason VARCHAR(40) NOT NULL,
    source_record_type VARCHAR(50) NOT NULL,
    last_postmark_message_id VARCHAR(120) NULL,
    first_suppressed_at DATETIME NOT NULL,
    last_suppressed_at DATETIME NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    PRIMARY KEY (email),
    KEY idx_email_suppressions_last_suppressed_at (last_suppressed_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

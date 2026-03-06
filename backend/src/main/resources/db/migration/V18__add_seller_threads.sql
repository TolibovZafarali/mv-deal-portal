CREATE TABLE IF NOT EXISTS seller_threads (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    property_id BIGINT UNSIGNED NOT NULL,
    seller_id BIGINT UNSIGNED NOT NULL,
    status VARCHAR(20) NOT NULL,
    topic_type VARCHAR(40) NOT NULL,
    topic_ref_id BIGINT UNSIGNED NULL,
    last_message_at DATETIME NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    PRIMARY KEY (id),
    KEY idx_seller_threads_seller_status (seller_id, status),
    KEY idx_seller_threads_property_status (property_id, status),
    KEY idx_seller_threads_topic (topic_type, topic_ref_id),
    KEY idx_seller_threads_last_message_at (last_message_at),

    CONSTRAINT fk_seller_threads_property
        FOREIGN KEY (property_id) REFERENCES properties(id)
        ON DELETE CASCADE,
    CONSTRAINT fk_seller_threads_seller
        FOREIGN KEY (seller_id) REFERENCES sellers(id)
        ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS seller_thread_messages (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    thread_id BIGINT UNSIGNED NOT NULL,
    sender_role VARCHAR(20) NOT NULL,
    sender_id BIGINT UNSIGNED NOT NULL,
    message_type VARCHAR(30) NOT NULL,
    body TEXT NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY (id),
    KEY idx_seller_thread_messages_thread_created (thread_id, created_at),
    KEY idx_seller_thread_messages_sender (sender_role, sender_id),

    CONSTRAINT fk_seller_thread_messages_thread
        FOREIGN KEY (thread_id) REFERENCES seller_threads(id)
        ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS seller_thread_reads (
    thread_id BIGINT UNSIGNED NOT NULL,
    principal_role VARCHAR(20) NOT NULL,
    principal_id BIGINT UNSIGNED NOT NULL,
    last_read_message_id BIGINT UNSIGNED NULL,
    last_read_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY (thread_id, principal_role, principal_id),
    KEY idx_seller_thread_reads_principal (principal_role, principal_id),

    CONSTRAINT fk_seller_thread_reads_thread
        FOREIGN KEY (thread_id) REFERENCES seller_threads(id)
        ON DELETE CASCADE,
    CONSTRAINT fk_seller_thread_reads_message
        FOREIGN KEY (last_read_message_id) REFERENCES seller_thread_messages(id)
        ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

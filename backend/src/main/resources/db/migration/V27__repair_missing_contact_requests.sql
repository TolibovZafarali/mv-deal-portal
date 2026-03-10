CREATE TABLE IF NOT EXISTS contact_requests (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    category VARCHAR(40) NOT NULL,
    name VARCHAR(160) NOT NULL,
    email VARCHAR(255) NOT NULL,
    message_body TEXT NOT NULL,
    status VARCHAR(20) NOT NULL,
    admin_email_status VARCHAR(20) NULL,
    confirmation_email_status VARCHAR(20) NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY (id),
    KEY idx_contact_requests_created (created_at),
    KEY idx_contact_requests_status (status),
    KEY idx_contact_requests_category (category),
    KEY idx_contact_requests_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

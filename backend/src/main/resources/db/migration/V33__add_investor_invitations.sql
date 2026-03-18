CREATE TABLE IF NOT EXISTS investor_invitations (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    first_name VARCHAR(80) NOT NULL,
    last_name VARCHAR(80) NOT NULL,
    email VARCHAR(255) NOT NULL,
    token_hash VARCHAR(64) NOT NULL,
    status VARCHAR(20) NOT NULL,
    expires_at DATETIME NOT NULL,
    sent_at DATETIME NULL,
    accepted_at DATETIME NULL,
    created_by_admin_id BIGINT UNSIGNED NOT NULL,
    investor_id BIGINT UNSIGNED NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    PRIMARY KEY (id),
    UNIQUE KEY uk_investor_invitations_token_hash (token_hash),
    KEY idx_investor_invitations_email_status (email, status),
    KEY idx_investor_invitations_expires_at (expires_at),
    KEY idx_investor_invitations_created_by_admin_id (created_by_admin_id),
    KEY idx_investor_invitations_investor_id (investor_id),
    CONSTRAINT fk_investor_invitations_admin
        FOREIGN KEY (created_by_admin_id) REFERENCES admins(id),
    CONSTRAINT fk_investor_invitations_investor
        FOREIGN KEY (investor_id) REFERENCES investors(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

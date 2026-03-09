CREATE TABLE IF NOT EXISTS refresh_tokens (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    principal_type VARCHAR(20) NOT NULL,
    principal_id BIGINT UNSIGNED NOT NULL,
    token_hash CHAR(64) NOT NULL,
    expires_at DATETIME NOT NULL,
    revoked_at DATETIME NULL,
    last_used_at DATETIME NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY (id),
    UNIQUE KEY uk_refresh_tokens_hash (token_hash),
    KEY idx_refresh_tokens_principal_active (principal_type, principal_id, revoked_at),
    KEY idx_refresh_tokens_expires_at (expires_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

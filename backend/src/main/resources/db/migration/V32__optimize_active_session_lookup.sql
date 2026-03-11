CREATE INDEX idx_refresh_tokens_principal_active_recent
    ON refresh_tokens (principal_type, principal_id, revoked_at, created_at, id);

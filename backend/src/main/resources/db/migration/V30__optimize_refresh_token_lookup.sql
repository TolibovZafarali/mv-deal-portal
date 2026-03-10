CREATE INDEX idx_refresh_tokens_lookup_active
    ON refresh_tokens (token_hash, revoked_at, expires_at);

ALTER TABLE password_reset_tokens
    ADD COLUMN verification_attempts INT NOT NULL DEFAULT 0 AFTER used_at;

ALTER TABLE sellers
    ADD COLUMN notification_email VARCHAR(255) NULL AFTER email;

UPDATE sellers
SET notification_email = email
WHERE notification_email IS NULL OR TRIM(notification_email) = '';

ALTER TABLE inquiries
    ADD COLUMN column_name VARCHAR(160) NOT NULL DEFAULT '' AFTER contact_name;
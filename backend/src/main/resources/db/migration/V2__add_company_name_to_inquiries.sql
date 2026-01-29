ALTER TABLE inquiries
    ADD COLUMN company_name VARCHAR(160) NOT NULL DEFAULT '' AFTER contact_name;
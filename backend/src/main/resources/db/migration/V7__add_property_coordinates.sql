ALTER TABLE properties
    ADD COLUMN latitude DECIMAL(10, 7) NULL AFTER zip,
    ADD COLUMN longitude DECIMAL(10, 7) NULL AFTER latitude;

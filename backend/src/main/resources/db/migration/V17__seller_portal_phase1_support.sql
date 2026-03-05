ALTER TABLE inquiries
    ADD INDEX idx_inquiries_property_created (property_id, created_at);

ALTER TABLE properties
    ADD INDEX idx_properties_seller_updated (seller_id, updated_at);

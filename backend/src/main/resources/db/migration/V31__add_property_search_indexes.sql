CREATE INDEX idx_properties_status_created_at
    ON properties (status, created_at);

CREATE INDEX idx_properties_workflow_submitted_created
    ON properties (seller_workflow_status, submitted_at, created_at);

UPDATE properties
SET seller_workflow_status = 'DRAFT'
WHERE seller_workflow_status = 'CHANGES_REQUESTED';

UPDATE contact_requests
SET status = 'REPLIED'
WHERE status IN ('IN_PROGRESS', 'CLOSED');

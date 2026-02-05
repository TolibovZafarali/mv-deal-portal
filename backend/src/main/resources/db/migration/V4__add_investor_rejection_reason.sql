ALTER TABLE investors
    ADD COLUMN rejection_reason VARCHAR(500) NULL AFTER status;
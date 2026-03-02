ALTER TABLE properties
    ADD COLUMN current_rent DECIMAL(12, 2) NULL AFTER occupancy_status;

UPDATE properties
SET occupancy_status = 'YES'
WHERE occupancy_status = 'TENANT';

UPDATE properties
SET occupancy_status = 'NO'
WHERE occupancy_status = 'VACANT';

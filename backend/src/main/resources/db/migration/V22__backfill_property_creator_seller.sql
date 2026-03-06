UPDATE properties
SET created_by_seller_id = seller_id
WHERE created_by_seller_id IS NULL
  AND seller_id IS NOT NULL;

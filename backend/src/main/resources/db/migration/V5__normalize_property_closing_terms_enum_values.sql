UPDATE properties
SET closing_terms = CASE
    WHEN TRIM(LOWER(closing_terms)) IN ('cash only', 'cash_only') THEN 'CASH_ONLY'
    WHEN TRIM(LOWER(closing_terms)) IN ('hard money', 'hard_money') THEN 'HARD_MONEY'
    WHEN TRIM(LOWER(closing_terms)) = 'conventional' THEN 'CONVENTIONAL'
    WHEN TRIM(LOWER(closing_terms)) IN ('seller finance', 'seller_finance') THEN 'SELLER_FINANCE'
    ELSE closing_terms
END
WHERE closing_terms IS NOT NULL;

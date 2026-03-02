-- Populate deterministic demo pricing for seeded store_services rows that currently have null prices.
-- This keeps data API-driven and enables meaningful price-range filtering in search.
WITH ranked_stores AS (
  SELECT id AS store_id,
         row_number() OVER (ORDER BY id) AS store_rank
  FROM stores
),
ranked_services AS (
  SELECT ss.store_id,
         ss.service_id,
         rs.store_rank,
         row_number() OVER (PARTITION BY ss.store_id ORDER BY ss.service_id) AS service_rank
  FROM store_services ss
  JOIN ranked_stores rs ON rs.store_id = ss.store_id
)
UPDATE store_services ss
SET base_price_cents = CASE (ranked_services.store_rank % 3)
    WHEN 0 THEN
      CASE
        WHEN ranked_services.service_rank = 1 THEN 3500
        ELSE 4500
      END
    WHEN 1 THEN
      CASE
        WHEN ranked_services.service_rank = 1 THEN 7000
        ELSE 11000
      END
    ELSE
      CASE
        WHEN ranked_services.service_rank = 1 THEN 16000
        ELSE 22000
      END
  END,
  duration_minutes = COALESCE(
    ss.duration_minutes,
    CASE
      WHEN ranked_services.service_rank = 1 THEN 30
      ELSE 75
    END
  ),
  updated_at = now()
FROM ranked_services
WHERE ss.store_id = ranked_services.store_id
  AND ss.service_id = ranked_services.service_id
  AND ss.base_price_cents IS NULL;

INSERT INTO services (name, description, category)
VALUES
  ('Tire Change', 'High quality tire changes.', 'Tires'),
  ('Oil Change', 'Fresh oil and filter service for everyday maintenance.', 'Maintenance'),
  ('Brake Inspection', 'Basic brake system inspection and service estimate.', 'Brakes'),
  ('Vehicle Diagnostics', 'Computer diagnostics and troubleshooting for warning lights.', 'Diagnostics')
ON CONFLICT (name) DO UPDATE
SET
  description = excluded.description,
  category = excluded.category,
  updated_at = now();

WITH baseline_services AS (
  SELECT
    id,
    name,
    CASE name
      WHEN 'Tire Change' THEN 8500
      WHEN 'Oil Change' THEN 6500
      WHEN 'Brake Inspection' THEN 7500
      WHEN 'Vehicle Diagnostics' THEN 14000
      ELSE 10000
    END AS base_price_cents,
    CASE name
      WHEN 'Tire Change' THEN 60
      WHEN 'Oil Change' THEN 45
      WHEN 'Brake Inspection' THEN 45
      WHEN 'Vehicle Diagnostics' THEN 60
      ELSE 60
    END AS duration_minutes
  FROM services
  WHERE name IN ('Tire Change', 'Oil Change', 'Brake Inspection', 'Vehicle Diagnostics')
)
INSERT INTO store_services (store_id, service_id, base_price_cents, duration_minutes)
SELECT
  s.id,
  bs.id,
  bs.base_price_cents,
  bs.duration_minutes
FROM stores s
CROSS JOIN baseline_services bs
WHERE coalesce(s.approval_status, 'APPROVED') = 'APPROVED'
ON CONFLICT (store_id, service_id) DO NOTHING;

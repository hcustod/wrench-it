-- Seed service catalog coverage and price data for the real GTA stores added in V36.
-- The real-shop-data branch only inserted bare store rows; this keeps compare, pricing,
-- and work-order flows functional for those shops.

INSERT INTO services (name, description, category)
VALUES
  ('General Auto Repair', 'General repair and mechanical troubleshooting', 'General'),
  ('Diagnostics', 'Vehicle diagnostics and troubleshooting', 'Diagnostics'),
  ('Mobile Mechanic Visit', 'On-site mobile mechanic service', 'Mobile'),
  ('Auto Glass Repair', 'Auto glass repair and replacement', 'Glass'),
  ('Window Tinting', 'Window tint installation and repair', 'Appearance'),
  ('Collision Repair', 'Collision, body, and paint repair', 'Body'),
  ('Tire Service', 'Tire repair, replacement, and balancing', 'Tires'),
  ('Mechanical Inspection', 'General mechanical inspection and certification', 'Inspection')
ON CONFLICT (name) DO NOTHING;

WITH real_gta_stores AS (
  SELECT id, services_text
  FROM stores
  WHERE google_place_id LIKE 'real-gta-%'
),
service_matches AS (
  SELECT s.id AS store_id, sv.id AS service_id, sv.name
  FROM real_gta_stores s
  JOIN services sv ON (
    (sv.name = 'Oil Change' AND s.services_text ILIKE '%oil%')
    OR (sv.name = 'Tire Rotation' AND s.services_text ILIKE '%tire rotation%')
    OR (sv.name = 'Tire Service' AND s.services_text ILIKE '%tire service%')
    OR (sv.name = 'Brake Pads Replacement' AND s.services_text ILIKE '%brake%')
    OR (sv.name = 'Battery Replacement' AND s.services_text ILIKE '%battery%')
    OR (sv.name = 'Diagnostics' AND s.services_text ILIKE '%diagnostic%')
    OR (sv.name = 'Mobile Mechanic Visit' AND s.services_text ILIKE '%mobile mechanic%')
    OR (sv.name = 'Auto Glass Repair' AND s.services_text ILIKE '%glass%')
    OR (sv.name = 'Window Tinting' AND s.services_text ILIKE '%tint%')
    OR (sv.name = 'Collision Repair' AND (s.services_text ILIKE '%collision%' OR s.services_text ILIKE '%paint%'))
    OR (sv.name = 'Mechanical Inspection' AND s.services_text ILIKE '%inspection%')
    OR (sv.name = 'Mechanical Inspection' AND s.services_text ILIKE '%certified%')
    OR (sv.name = 'General Auto Repair' AND (
      s.services_text ILIKE '%general auto repair%'
      OR s.services_text ILIKE '%auto repair%'
      OR s.services_text ILIKE '%mechanical%'
      OR s.services_text ILIKE '%maintenance%'
    ))
  )
)
INSERT INTO store_services (
  store_id,
  service_id,
  base_price_cents,
  duration_minutes
)
SELECT
  sm.store_id,
  sm.service_id,
  CASE sm.name
    WHEN 'Oil Change' THEN 6500
    WHEN 'Tire Rotation' THEN 4500
    WHEN 'Tire Service' THEN 8000
    WHEN 'Brake Pads Replacement' THEN 18000
    WHEN 'Battery Replacement' THEN 16000
    WHEN 'Diagnostics' THEN 14000
    WHEN 'General Auto Repair' THEN 12500
    WHEN 'Mechanical Inspection' THEN 9500
    WHEN 'Mobile Mechanic Visit' THEN 15000
    WHEN 'Auto Glass Repair' THEN 22000
    WHEN 'Window Tinting' THEN 18000
    WHEN 'Collision Repair' THEN 45000
    ELSE 10000
  END AS base_price_cents,
  CASE sm.name
    WHEN 'Oil Change' THEN 45
    WHEN 'Tire Rotation' THEN 30
    WHEN 'Tire Service' THEN 60
    WHEN 'Brake Pads Replacement' THEN 90
    WHEN 'Battery Replacement' THEN 45
    WHEN 'Diagnostics' THEN 60
    WHEN 'General Auto Repair' THEN 90
    WHEN 'Mechanical Inspection' THEN 60
    WHEN 'Mobile Mechanic Visit' THEN 75
    WHEN 'Auto Glass Repair' THEN 120
    WHEN 'Window Tinting' THEN 120
    WHEN 'Collision Repair' THEN 240
    ELSE 60
  END AS duration_minutes
FROM service_matches sm
ON CONFLICT (store_id, service_id) DO UPDATE
SET
  base_price_cents = excluded.base_price_cents,
  duration_minutes = excluded.duration_minutes,
  updated_at = now();

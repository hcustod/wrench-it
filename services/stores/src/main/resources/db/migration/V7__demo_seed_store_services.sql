
WITH st AS (
  SELECT id FROM stores ORDER BY created_at LIMIT 3
),
sv AS (
  SELECT id FROM services ORDER BY name LIMIT 2
)
INSERT INTO store_services (store_id, service_id)
SELECT st.id, sv.id
FROM st CROSS JOIN sv
ON CONFLICT DO NOTHING;

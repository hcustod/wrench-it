WITH st AS (
  SELECT id, row_number() over (order by created_at) AS rn
  FROM stores
  ORDER BY created_at
  OFFSET 3
),
svc AS (

  SELECT id, row_number() over (order by created_at) AS rn
  FROM services
  ORDER BY created_at
  LIMIT 2
)
INSERT INTO store_services (store_id, service_id)
SELECT st.id, svc.id
FROM st
CROSS JOIN svc
ON CONFLICT DO NOTHING;


WITH u AS (
  SELECT id FROM users WHERE keycloak_sub = 'demo-sub-1' LIMIT 1
),
st AS (
  SELECT id, row_number() over (order by created_at) AS rn
  FROM stores
  ORDER BY created_at
  OFFSET 3
)
INSERT INTO store_reviews (store_id, user_id, rating, comment)
SELECT
  st.id,
  u.id,
  4,
  'Demo review for store #' || st.rn
FROM st
CROSS JOIN u
ON CONFLICT (store_id, user_id) DO NOTHING;
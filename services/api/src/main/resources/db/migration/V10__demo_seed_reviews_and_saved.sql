-- Create 3 demo users
INSERT INTO users (keycloak_sub, email, display_name, role)
VALUES
  ('demo-sub-1', 'demo1@wrenchit.local', 'Demo User 1', 'CUSTOMER'),
  ('demo-sub-2', 'demo2@wrenchit.local', 'Demo User 2', 'CUSTOMER'),
  ('demo-sub-3', 'demo3@wrenchit.local', 'Demo User 3', 'CUSTOMER')
ON CONFLICT (keycloak_sub) DO NOTHING;

-- Add reviews for first 3 stores from those demo users
WITH st AS (
  SELECT id FROM stores ORDER BY created_at LIMIT 3
),
u AS (
  SELECT id, row_number() over (order by created_at) as rn
  FROM users
  WHERE keycloak_sub IN ('demo-sub-1','demo-sub-2','demo-sub-3')
),
pairs AS (
  SELECT st.id as store_id, u.id as user_id, u.rn
  FROM st
  JOIN u ON u.rn <= 3
)
INSERT INTO store_reviews (store_id, user_id, rating, comment)
SELECT
  p.store_id,
  p.user_id,
  (3 + (p.rn % 3)) as rating,
  'Demo review ' || p.rn
FROM pairs p
ON CONFLICT (store_id, user_id) DO NOTHING;

-- Save a couple shops for demo users
WITH u1 AS (SELECT id FROM users WHERE keycloak_sub='demo-sub-1' LIMIT 1),
     u2 AS (SELECT id FROM users WHERE keycloak_sub='demo-sub-2' LIMIT 1),
     s1 AS (SELECT id FROM stores ORDER BY created_at LIMIT 1),
     s2 AS (SELECT id FROM stores ORDER BY created_at OFFSET 1 LIMIT 1)
INSERT INTO saved_shops (user_id, store_id)
SELECT u1.id, s1.id FROM u1 CROSS JOIN s1
UNION ALL
SELECT u2.id, s2.id FROM u2 CROSS JOIN s2
ON CONFLICT DO NOTHING;

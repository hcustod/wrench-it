WITH st AS (
  SELECT id FROM stores ORDER BY created_at OFFSET 3 LIMIT 3
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
  (4 - (p.rn % 2)) as rating,   
  'Extra demo review ' || p.rn
FROM pairs p
ON CONFLICT (store_id, user_id) DO NOTHING;


WITH u1 AS (SELECT id FROM users WHERE keycloak_sub='demo-sub-1' LIMIT 1),
     u3 AS (SELECT id FROM users WHERE keycloak_sub='demo-sub-3' LIMIT 1),
     s3 AS (SELECT id FROM stores ORDER BY created_at OFFSET 2 LIMIT 1),
     s4 AS (SELECT id FROM stores ORDER BY created_at OFFSET 3 LIMIT 1)
INSERT INTO saved_shops (user_id, store_id)
SELECT u1.id, s3.id FROM u1 CROSS JOIN s3
UNION ALL
SELECT u3.id, s4.id FROM u3 CROSS JOIN s4
ON CONFLICT DO NOTHING;
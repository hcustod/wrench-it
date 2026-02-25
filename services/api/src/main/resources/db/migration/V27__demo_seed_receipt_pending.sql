WITH u AS (
  SELECT id
  FROM users
  WHERE keycloak_sub = 'demo-sub-1'
  LIMIT 1
),
st AS (
  SELECT id
  FROM stores
  WHERE country = 'CA' AND (city ILIKE 'Toronto' OR city ILIKE 'Mississauga' OR city ILIKE 'Brampton' OR city ILIKE 'Markham' OR city ILIKE 'Vaughan')
  ORDER BY created_at
  LIMIT 1
)
INSERT INTO receipt_uploads (
  user_id,
  store_id,
  file_key,
  original_filename,
  mime_type,
  size_bytes,
  status,
  currency,
  total_cents
)
SELECT
  u.id,
  st.id,
  'demo/receipts/demo-sub-1-receipt-pending-003.jpg',
  'pending-receipt-003.jpg',
  'image/jpeg',
  245678,
  'READY_FOR_REVIEW',
  'CAD',
  8799
FROM u
CROSS JOIN st
ON CONFLICT (file_key) DO NOTHING;
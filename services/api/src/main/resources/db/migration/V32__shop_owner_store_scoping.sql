CREATE TABLE IF NOT EXISTS shop_owner_stores (
  owner_user_id uuid PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  store_id      uuid NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_shop_owner_stores_store_id
  ON shop_owner_stores (store_id);

INSERT INTO shop_owner_stores (owner_user_id, store_id)
SELECT
  u.id,
  s.id
FROM users u
JOIN LATERAL (
  SELECT st.id
  FROM stores st
  WHERE lower(st.name) = lower(u.shop_name)
  ORDER BY st.created_at ASC, st.id ASC
  LIMIT 1
) s ON true
WHERE upper(coalesce(u.role, '')) = 'SHOP_OWNER'
  AND nullif(trim(u.shop_name), '') IS NOT NULL
ON CONFLICT (owner_user_id) DO NOTHING;

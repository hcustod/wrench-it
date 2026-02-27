CREATE TABLE IF NOT EXISTS shop_profiles (
  store_id     uuid PRIMARY KEY REFERENCES stores(id) ON DELETE CASCADE,
  description  varchar(2000),
  hours_json   jsonb,
  updated_at   timestamptz NOT NULL DEFAULT now()
);

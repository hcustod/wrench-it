ALTER TABLE users
  ADD COLUMN IF NOT EXISTS phone varchar(40),
  ADD COLUMN IF NOT EXISTS certification_number varchar(80),
  ADD COLUMN IF NOT EXISTS years_experience integer,
  ADD COLUMN IF NOT EXISTS shop_name varchar(160),
  ADD COLUMN IF NOT EXISTS business_license varchar(120);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'chk_users_years_experience_range'
  ) THEN
    ALTER TABLE users
      ADD CONSTRAINT chk_users_years_experience_range
      CHECK (years_experience IS NULL OR (years_experience >= 0 AND years_experience <= 80));
  END IF;
END $$;

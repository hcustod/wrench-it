ALTER TABLE store_reviews
  ADD COLUMN IF NOT EXISTS service_id uuid,
  ADD COLUMN IF NOT EXISTS receipt_id uuid;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.table_constraints
    WHERE table_name = 'store_reviews'
      AND constraint_name = 'fk_store_reviews_service'
  ) THEN
    ALTER TABLE store_reviews
      ADD CONSTRAINT fk_store_reviews_service
      FOREIGN KEY (service_id) REFERENCES services(id) ON DELETE SET NULL;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.table_constraints
    WHERE table_name = 'store_reviews'
      AND constraint_name = 'fk_store_reviews_receipt'
  ) THEN
    ALTER TABLE store_reviews
      ADD CONSTRAINT fk_store_reviews_receipt
      FOREIGN KEY (receipt_id) REFERENCES receipt_uploads(id) ON DELETE SET NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_store_reviews_service_id
  ON store_reviews (service_id);

CREATE INDEX IF NOT EXISTS idx_store_reviews_receipt_id
  ON store_reviews (receipt_id);

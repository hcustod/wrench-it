ALTER TABLE stores
  ADD COLUMN IF NOT EXISTS approval_status varchar(20) NOT NULL DEFAULT 'APPROVED',
  ADD COLUMN IF NOT EXISTS approval_notes varchar(2000),
  ADD COLUMN IF NOT EXISTS approval_requested_at timestamptz,
  ADD COLUMN IF NOT EXISTS approval_reviewed_at timestamptz,
  ADD COLUMN IF NOT EXISTS approval_reviewed_by uuid;

UPDATE stores
SET approval_status = 'APPROVED'
WHERE approval_status IS NULL;

UPDATE stores
SET approval_requested_at = created_at
WHERE approval_requested_at IS NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'chk_stores_approval_status'
  ) THEN
    ALTER TABLE stores
      ADD CONSTRAINT chk_stores_approval_status
      CHECK (approval_status IN ('PENDING', 'APPROVED', 'REJECTED'));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.table_constraints
    WHERE table_name = 'stores'
      AND constraint_name = 'fk_stores_approval_reviewed_by'
  ) THEN
    ALTER TABLE stores
      ADD CONSTRAINT fk_stores_approval_reviewed_by
      FOREIGN KEY (approval_reviewed_by) REFERENCES users(id) ON DELETE SET NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_stores_approval_status
  ON stores (approval_status);

CREATE TABLE IF NOT EXISTS work_orders (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  store_id uuid NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  customer_user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  service_id uuid NOT NULL REFERENCES services(id) ON DELETE RESTRICT,
  status varchar(20) NOT NULL DEFAULT 'REQUESTED',
  scheduled_for timestamptz NOT NULL,
  vehicle_year integer,
  vehicle_make varchar(80),
  vehicle_model varchar(80),
  customer_notes varchar(2000),
  owner_notes varchar(2000),
  estimated_total_cents integer CHECK (estimated_total_cents IS NULL OR estimated_total_cents >= 0),
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT chk_work_orders_status
    CHECK (status IN ('REQUESTED', 'CONFIRMED', 'IN_PROGRESS', 'COMPLETED', 'DECLINED', 'CANCELED'))
);

CREATE INDEX IF NOT EXISTS idx_work_orders_customer_created
  ON work_orders (customer_user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_work_orders_store_created
  ON work_orders (store_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_work_orders_store_status
  ON work_orders (store_id, status, scheduled_for);

ALTER TABLE store_reviews
  ADD COLUMN IF NOT EXISTS work_order_id uuid;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.table_constraints
    WHERE table_name = 'store_reviews'
      AND constraint_name = 'fk_store_reviews_work_order'
  ) THEN
    ALTER TABLE store_reviews
      ADD CONSTRAINT fk_store_reviews_work_order
      FOREIGN KEY (work_order_id) REFERENCES work_orders(id) ON DELETE SET NULL;
  END IF;
END $$;

DROP INDEX IF EXISTS uq_store_reviews_store_user;

CREATE UNIQUE INDEX IF NOT EXISTS uq_store_reviews_work_order
  ON store_reviews (work_order_id)
  WHERE work_order_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_store_reviews_work_order_id
  ON store_reviews (work_order_id);

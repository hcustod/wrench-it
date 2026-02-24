-- V19__receipt_uploads.sql
-- stores receipt file metadata and state does NOT store the file itself

CREATE TABLE IF NOT EXISTS receipt_uploads (
  id           uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id      uuid NOT NULL,
  store_id     uuid NULL,

  -- where the file lives (S3/GCS/local path) must be unique
  file_key     varchar(500) NOT NULL,

  -- what was uploaded
  original_filename varchar(255),
  mime_type    varchar(120),
  size_bytes   bigint CHECK (size_bytes IS NULL OR size_bytes >= 0),

  -- app state machine
  status       varchar(30) NOT NULL DEFAULT 'UPLOADED',

  -- optional: extracted totals later (kept nullable for now)
  currency     char(3),
  total_cents  integer CHECK (total_cents IS NULL OR total_cents >= 0),

  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT fk_receipt_uploads_user
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,

  CONSTRAINT fk_receipt_uploads_store
    FOREIGN KEY (store_id) REFERENCES stores(id) ON DELETE SET NULL,

  CONSTRAINT uq_receipt_uploads_file_key
    UNIQUE (file_key),

  CONSTRAINT receipt_uploads_status_check
    CHECK (status IN (
      'UPLOADED',      -- user uploaded, not processed yet
      'PROCESSING',    -- OCR / parsing in progress
      'READY_FOR_REVIEW', -- parsed and waiting for human/expert
      'APPROVED',      -- validated
      'REJECTED'       -- invalid / failed validation
    ))
);

-- help index
CREATE INDEX IF NOT EXISTS idx_receipt_uploads_user_created
  ON receipt_uploads (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_receipt_uploads_store_created
  ON receipt_uploads (store_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_receipt_uploads_status_created
  ON receipt_uploads (status, created_at DESC);
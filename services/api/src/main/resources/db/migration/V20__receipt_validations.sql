-- V20__receipt_validations.sql
-- stores review/validation decisions and notes allows multiple validation attempts

CREATE TABLE IF NOT EXISTS receipt_validations (
  id              uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  receipt_id      uuid NOT NULL,
  validator_user_id uuid NULL,

  result          varchar(20) NOT NULL,
  notes           varchar(2000),

  validated_at    timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT fk_receipt_validations_receipt
    FOREIGN KEY (receipt_id) REFERENCES receipt_uploads(id) ON DELETE CASCADE,

  CONSTRAINT fk_receipt_validations_validator
    FOREIGN KEY (validator_user_id) REFERENCES users(id) ON DELETE SET NULL,

  CONSTRAINT receipt_validations_result_check
    CHECK (result IN ('APPROVED', 'REJECTED', 'NEEDS_INFO'))
);

-- common queries: "show validations for receipt", "my validations"
CREATE INDEX IF NOT EXISTS idx_receipt_validations_receipt_validated_at
  ON receipt_validations (receipt_id, validated_at DESC);

CREATE INDEX IF NOT EXISTS idx_receipt_validations_validator_validated_at
  ON receipt_validations (validator_user_id, validated_at DESC);
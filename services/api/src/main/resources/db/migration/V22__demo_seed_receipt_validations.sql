-- V22: seed validations for the demo receipts created in V21
WITH
u1 AS (SELECT id FROM users WHERE keycloak_sub = 'demo-sub-1' LIMIT 1),
u2 AS (SELECT id FROM users WHERE keycloak_sub = 'demo-sub-2' LIMIT 1),

-- receipt owned by demo-sub-1 gets validated by demo-sub-2
ins1 AS (
  INSERT INTO receipt_validations (receipt_id, validator_user_id, result, notes)
  SELECT
    ru.id,
    (SELECT id FROM u2),
    'APPROVED',
    'Demo validation: looks good.'
  FROM receipt_uploads ru
  WHERE ru.file_key = 'demo/receipts/demo-sub-1-receipt-001.jpg'
    AND EXISTS (SELECT 1 FROM u2)
    AND NOT EXISTS (
      SELECT 1 FROM receipt_validations rv WHERE rv.receipt_id = ru.id
    )
  RETURNING 1
),

-- receipt owned by demo-sub-2 gets validated by demo-sub-1
ins2 AS (
  INSERT INTO receipt_validations (receipt_id, validator_user_id, result, notes)
  SELECT
    ru.id,
    (SELECT id FROM u1),
    'APPROVED',
    'Demo validation: approved.'
  FROM receipt_uploads ru
  WHERE ru.file_key = 'demo/receipts/demo-sub-2-receipt-002.pdf'
    AND EXISTS (SELECT 1 FROM u1)
    AND NOT EXISTS (
      SELECT 1 FROM receipt_validations rv WHERE rv.receipt_id = ru.id
    )
  RETURNING 1
)

SELECT
  (SELECT count(*) FROM ins1) AS inserted_validation_1,
  (SELECT count(*) FROM ins2) AS inserted_validation_2;
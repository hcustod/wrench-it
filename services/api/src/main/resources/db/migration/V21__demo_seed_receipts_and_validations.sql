WITH
u1 AS (SELECT id FROM users WHERE keycloak_sub = 'demo-sub-1' LIMIT 1),
u2 AS (SELECT id FROM users WHERE keycloak_sub = 'demo-sub-2' LIMIT 1),
s1 AS (SELECT id FROM stores ORDER BY created_at ASC LIMIT 1),
s2 AS (SELECT id FROM stores ORDER BY created_at ASC OFFSET 1 LIMIT 1),

r1 AS (
  INSERT INTO receipt_uploads (
    user_id, store_id, file_key, original_filename, mime_type, size_bytes,
    status, currency, total_cents
  )
  SELECT
    (SELECT id FROM u1),
    (SELECT id FROM s1),
    'demo/receipts/demo-sub-1-receipt-001.jpg',
    'receipt-001.jpg',
    'image/jpeg',
    245678,
    'READY_FOR_REVIEW',
    'CAD',
    4599
  WHERE EXISTS (SELECT 1 FROM u1)
    AND EXISTS (SELECT 1 FROM s1)
    AND NOT EXISTS (
      SELECT 1 FROM receipt_uploads
      WHERE file_key = 'demo/receipts/demo-sub-1-receipt-001.jpg'
    )
  RETURNING id
),

r2 AS (
  INSERT INTO receipt_uploads (
    user_id, store_id, file_key, original_filename, mime_type, size_bytes,
    status, currency, total_cents
  )
  SELECT
    (SELECT id FROM u2),
    (SELECT id FROM s2),
    'demo/receipts/demo-sub-2-receipt-002.pdf',
    'receipt-002.pdf',
    'application/pdf',
    912345,
    'APPROVED',
    'CAD',
    12999
  WHERE EXISTS (SELECT 1 FROM u2)
    AND EXISTS (SELECT 1 FROM s2)
    AND NOT EXISTS (
      SELECT 1 FROM receipt_uploads
      WHERE file_key = 'demo/receipts/demo-sub-2-receipt-002.pdf'
    )
  RETURNING id
),

v1 AS (
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

v2 AS (
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
  (SELECT count(*) FROM r1) AS inserted_receipt_1,
  (SELECT count(*) FROM r2) AS inserted_receipt_2,
  (SELECT count(*) FROM v1) AS inserted_validation_1,
  (SELECT count(*) FROM v2) AS inserted_validation_2;
CREATE OR REPLACE VIEW v_receipt_details AS
SELECT
  r.id,
  r.user_id,
  u.display_name AS uploader_name,
  r.store_id,
  s.name AS store_name,
  r.file_key,
  r.original_filename,
  r.mime_type,
  r.size_bytes,
  r.status,
  r.currency,
  r.total_cents,
  r.created_at,
  r.updated_at,

  rv.result AS latest_result,
  rv.validator_user_id,
  vu.display_name AS validator_name,
  rv.validated_at AS latest_validated_at,
  rv.notes AS latest_notes
FROM receipt_uploads r
JOIN users u ON u.id = r.user_id
LEFT JOIN stores s ON s.id = r.store_id
LEFT JOIN LATERAL (
  SELECT *
  FROM receipt_validations
  WHERE receipt_id = r.id
  ORDER BY validated_at DESC
  LIMIT 1
) rv ON true
LEFT JOIN users vu ON vu.id = rv.validator_user_id;
CREATE OR REPLACE VIEW v_store_services AS
SELECT
  ss.store_id,
  s.name AS store_name,
  ss.service_id,
  sv.name AS service_name,
  sv.category,
  ss.base_price_cents,
  ss.duration_minutes
FROM store_services ss
JOIN stores s ON s.id = ss.store_id
JOIN services sv ON sv.id = ss.service_id;

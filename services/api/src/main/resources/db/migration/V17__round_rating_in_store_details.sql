CREATE OR REPLACE VIEW v_store_details AS
SELECT
  s.id,
  s.name,
  s.created_at,

  COALESCE(vsr.review_count, 0) AS review_count,

  -- Round but keep double precision
  COALESCE(ROUND(vsr.avg_rating::numeric, 1)::double precision, 0) AS avg_rating,

  COALESCE(vsvc.services_list, '') AS services_list
FROM stores s
LEFT JOIN v_store_rating_summary vsr
  ON vsr.store_id = s.id
LEFT JOIN (
  SELECT
    store_id,
    string_agg(service_name, ', ' ORDER BY service_name) AS services_list
  FROM v_store_services
  GROUP BY store_id
) vsvc
  ON vsvc.store_id = s.id;
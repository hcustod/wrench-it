CREATE OR REPLACE VIEW v_store_details AS
SELECT
  s.id,
  s.name,
  s.created_at,
  COALESCE(rs.review_count, 0) AS review_count,
  COALESCE(rs.avg_rating, 0)   AS avg_rating,
  COALESCE(ss.services_list, '') AS services_list
FROM stores s
LEFT JOIN v_store_rating_summary rs
  ON rs.store_id = s.id
LEFT JOIN (
  SELECT
    store_id,
    string_agg(service_name, ', ' ORDER BY category, service_name) AS services_list
  FROM v_store_services
  GROUP BY store_id
) ss
  ON ss.store_id = s.id;
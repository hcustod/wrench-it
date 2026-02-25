CREATE OR REPLACE VIEW v_store_rating_summary AS
SELECT
  store_id,
  COUNT(*)::int AS review_count,
  AVG(rating)::double precision AS avg_rating
FROM store_reviews
GROUP BY store_id;
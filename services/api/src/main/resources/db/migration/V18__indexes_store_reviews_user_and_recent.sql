-- Add indexes to support common queries:
-- 1) Fetch all reviews by a user
-- 2) Fetch latest reviews for a store quickly

CREATE INDEX IF NOT EXISTS idx_store_reviews_user_id
  ON store_reviews (user_id);

CREATE INDEX IF NOT EXISTS idx_store_reviews_store_created_at
  ON store_reviews (store_id, created_at DESC);
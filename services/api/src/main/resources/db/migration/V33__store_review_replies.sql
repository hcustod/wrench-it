CREATE TABLE IF NOT EXISTS store_review_replies (
  review_id uuid PRIMARY KEY REFERENCES store_reviews(id) ON DELETE CASCADE,
  owner_user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  reply_text varchar(2000) NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_store_review_replies_owner_user
  ON store_review_replies (owner_user_id);

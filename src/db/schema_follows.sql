-- Run once against your MeiMG database, e.g.:
--   psql "$DATABASE_URL" -f src/db/schema_follows.sql

-- follower_id follows following_id.
CREATE TABLE IF NOT EXISTS follows (
    follower_id INTEGER NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    following_id INTEGER NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (follower_id, following_id),
    CHECK (follower_id <> following_id)
);

CREATE INDEX IF NOT EXISTS idx_follows_following_id ON follows (following_id);
CREATE INDEX IF NOT EXISTS idx_follows_follower_id ON follows (follower_id);

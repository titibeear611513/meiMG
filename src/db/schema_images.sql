-- Run once against your MeiMG database, e.g.:
--   psql "$DATABASE_URL" -f src/db/schema_images.sql

-- One row per uploaded image file (metadata + owner). Files live on disk under ./uploads.
CREATE TABLE IF NOT EXISTS images (
    id BIGSERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    file_name TEXT NOT NULL,
    image_url TEXT,
    title TEXT,
    description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Migration support for existing databases.
ALTER TABLE images ADD COLUMN IF NOT EXISTS image_url TEXT;

-- Backfill old rows so the link is also stored in DB.
UPDATE images
SET image_url = '/uploads/' || file_name
WHERE image_url IS NULL;

ALTER TABLE images ALTER COLUMN image_url SET NOT NULL;

CREATE INDEX IF NOT EXISTS idx_images_user_id ON images (user_id);
CREATE INDEX IF NOT EXISTS idx_images_created_at ON images (created_at DESC);

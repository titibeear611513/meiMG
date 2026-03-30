-- Run once against your MeiMG database, e.g.:
--   psql "$DATABASE_URL" -f src/db/schema_saves.sql

-- One row means: user saved this image.
CREATE TABLE IF NOT EXISTS saved_images (
    user_id INTEGER NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    image_id BIGINT NOT NULL REFERENCES images (id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (user_id, image_id)
);

CREATE INDEX IF NOT EXISTS idx_saved_images_image_id ON saved_images (image_id);
CREATE INDEX IF NOT EXISTS idx_saved_images_user_id ON saved_images (user_id);

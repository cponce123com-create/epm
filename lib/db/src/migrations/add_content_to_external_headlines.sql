ALTER TABLE external_headlines
  ADD COLUMN IF NOT EXISTS content TEXT,
  ADD COLUMN IF NOT EXISTS image_url VARCHAR(1024),
  ADD COLUMN IF NOT EXISTS slug VARCHAR(200);
CREATE INDEX IF NOT EXISTS idx_external_slug ON external_headlines(slug);

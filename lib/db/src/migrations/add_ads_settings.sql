-- Migración: claves de publicidad directa (idempotente)
INSERT INTO site_settings (key, value, created_at, updated_at)
VALUES
  ('ads_mode',          'disabled', NOW(), NOW()),
  ('ad_slot_1_image',   '',         NOW(), NOW()),
  ('ad_slot_1_link',    '',         NOW(), NOW()),
  ('ad_slot_1_alt',     '',         NOW(), NOW()),
  ('ad_slot_2_image',   '',         NOW(), NOW()),
  ('ad_slot_2_link',    '',         NOW(), NOW()),
  ('ad_slot_2_alt',     '',         NOW(), NOW())
ON CONFLICT (key) DO NOTHING;

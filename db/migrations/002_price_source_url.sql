ALTER TABLE entries ADD COLUMN IF NOT EXISTS price_source_url text;

ALTER TABLE entries DROP CONSTRAINT IF EXISTS entries_price_source_url_chk;
ALTER TABLE entries ADD CONSTRAINT entries_price_source_url_chk
  CHECK (price_source_url IS NULL OR price_source_url LIKE 'https://%');

CREATE TABLE IF NOT EXISTS schema_migrations (
  filename text PRIMARY KEY,
  applied_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  vendor text NOT NULL,
  name text NOT NULL,
  category text NOT NULL,
  summary text NOT NULL,
  official_url text NOT NULL,
  genre_tags text[] NOT NULL DEFAULT '{}',
  os_formats text,
  price_status text NOT NULL,
  price_amount numeric,
  price_currency text,
  price_summary text,
  price_verified_at timestamptz,
  source_checked_at timestamptz,
  source_note text,
  sale_amount numeric,
  sale_currency text,
  sale_verified_at timestamptz,
  sale_expires_at timestamptz,
  sale_expiry_unknown boolean NOT NULL DEFAULT false,
  active_deal boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT entries_category_chk CHECK (category IN ('amp-sim', 'effects', 'cabinet-ir', 'recording', 'amp-capture')),
  CONSTRAINT entries_price_status_chk CHECK (price_status IN ('unverified', 'verified_free', 'verified_list', 'verified_sale')),
  CONSTRAINT entries_url_chk CHECK (official_url LIKE 'https://%'),
  CONSTRAINT entries_deal_chk CHECK (
    active_deal = false OR (
      price_status = 'verified_sale'
      AND sale_amount IS NOT NULL
      AND sale_currency IS NOT NULL
      AND sale_verified_at IS NOT NULL
      AND (sale_expires_at IS NOT NULL OR sale_expiry_unknown = true)
    )
  )
);

CREATE TABLE IF NOT EXISTS submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  status text NOT NULL DEFAULT 'pending',
  vendor text NOT NULL,
  name text NOT NULL,
  category text NOT NULL,
  official_url text NOT NULL,
  note text NOT NULL DEFAULT '',
  review_note text,
  reviewed_at timestamptz,
  CONSTRAINT submissions_status_chk CHECK (status IN ('pending', 'approved', 'rejected')),
  CONSTRAINT submissions_url_chk CHECK (official_url LIKE 'https://%')
);

CREATE INDEX IF NOT EXISTS submissions_status_idx ON submissions (status, created_at);

CREATE TABLE IF NOT EXISTS signups (
  id uuid PRIMARY KEY,
  email text NOT NULL,
  email_normalized text NOT NULL UNIQUE,
  status text NOT NULL,
  consent_at timestamptz NOT NULL,
  consent_source text NOT NULL,
  consent_text text NOT NULL,
  token_hash text NOT NULL,
  leadmail_sync text NOT NULL DEFAULT 'not_attempted',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  unsubscribed_at timestamptz,
  CONSTRAINT signups_status_chk CHECK (status IN ('pending', 'unsubscribed')),
  CONSTRAINT signups_sync_chk CHECK (leadmail_sync IN ('not_attempted', 'disabled', 'failed', 'synced')),
  CONSTRAINT signups_source_chk CHECK (consent_source IN ('home', 'newsletter'))
);

CREATE TABLE IF NOT EXISTS search_misses (
  query_norm text NOT NULL,
  day date NOT NULL DEFAULT CURRENT_DATE,
  hits integer NOT NULL DEFAULT 1,
  PRIMARY KEY (query_norm, day)
);

CREATE TABLE IF NOT EXISTS pageviews (
  path text NOT NULL,
  viewed_on date NOT NULL DEFAULT CURRENT_DATE,
  hits integer NOT NULL DEFAULT 0,
  PRIMARY KEY (path, viewed_on)
);

CREATE TABLE IF NOT EXISTS sponsors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  name text NOT NULL,
  destination_url text NOT NULL,
  active boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT sponsors_url_chk CHECK (destination_url LIKE 'https://%'),
  CONSTRAINT sponsors_slug_chk CHECK (slug ~ '^[a-z0-9-]{1,64}$')
);

CREATE TABLE IF NOT EXISTS sponsor_weeks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sponsor_id uuid NOT NULL REFERENCES sponsors (id),
  week_start date NOT NULL UNIQUE,
  price_cents integer NOT NULL,
  status text NOT NULL,
  CONSTRAINT sponsor_weeks_status_chk CHECK (status IN ('available', 'sold', 'ended')),
  CONSTRAINT sponsor_weeks_price_chk CHECK (price_cents >= 0)
);

CREATE TABLE IF NOT EXISTS sponsor_clicks (
  sponsor_id uuid NOT NULL REFERENCES sponsors (id),
  clicked_on date NOT NULL DEFAULT CURRENT_DATE,
  hits integer NOT NULL DEFAULT 0,
  PRIMARY KEY (sponsor_id, clicked_on)
);

CREATE TABLE IF NOT EXISTS enquiries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  name text NOT NULL,
  email text NOT NULL,
  organisation text,
  message text NOT NULL,
  status text NOT NULL DEFAULT 'new'
);

CREATE TABLE IF NOT EXISTS app_errors (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  created_at timestamptz NOT NULL DEFAULT now(),
  area text NOT NULL,
  code text NOT NULL,
  message text NOT NULL
);

-- Tenant integration columns for portal setup screens
ALTER TABLE tenants
  ADD COLUMN IF NOT EXISTS stripe_customer_id      TEXT,
  ADD COLUMN IF NOT EXISTS stripe_subscription_id  TEXT,
  ADD COLUMN IF NOT EXISTS stripe_account_id       TEXT,
  ADD COLUMN IF NOT EXISTS commission_pct          NUMERIC(5,2) NOT NULL DEFAULT 2.00,
  ADD COLUMN IF NOT EXISTS waba_id                 TEXT,
  ADD COLUMN IF NOT EXISTS wa_phone_number_id      TEXT,
  ADD COLUMN IF NOT EXISTS wa_access_token         TEXT,
  ADD COLUMN IF NOT EXISTS distributor_code        TEXT,
  ADD COLUMN IF NOT EXISTS distributor_credentials JSONB,
  ADD COLUMN IF NOT EXISTS distributor_synced_at   TIMESTAMPTZ;

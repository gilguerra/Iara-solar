-- ===== TENANTS =====
-- Each company that uses the platform is a tenant.
CREATE TABLE tenants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(100) NOT NULL UNIQUE,  -- e.g. 'iarasolar', 'solarprime'
  plan VARCHAR(30) NOT NULL DEFAULT 'starter',  -- starter | pro | enterprise
  status VARCHAR(30) NOT NULL DEFAULT 'active',
  settings JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_tenants_slug ON tenants(slug);
CREATE INDEX idx_tenants_status ON tenants(status);

-- ===== API KEYS =====
-- Each tenant can have multiple API keys (e.g. one for n8n, one for a mobile app).
-- We store the SHA-256 hash of the key — never the raw key.
CREATE TABLE api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  key_hash VARCHAR(64) NOT NULL UNIQUE,  -- SHA-256 hex digest (64 chars)
  name VARCHAR(100) NOT NULL DEFAULT 'default',
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  last_used_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,  -- NULL means never expires
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_api_keys_tenant_id ON api_keys(tenant_id);
CREATE INDEX idx_api_keys_key_hash ON api_keys(key_hash);

-- ===== ADD tenant_id TO EXISTING TABLES =====

-- leads
ALTER TABLE leads
  ADD COLUMN tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE;
CREATE INDEX idx_leads_tenant_id ON leads(tenant_id);

-- budget_requests (denormalized for query performance — avoids joining leads every time)
ALTER TABLE budget_requests
  ADD COLUMN tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE;
CREATE INDEX idx_budget_requests_tenant_id ON budget_requests(tenant_id);

-- quote_versions (same denormalization rationale)
ALTER TABLE quote_versions
  ADD COLUMN tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE;
CREATE INDEX idx_quote_versions_tenant_id ON quote_versions(tenant_id);

-- supplier_sources — each tenant manages their own supplier catalog
ALTER TABLE supplier_sources
  ADD COLUMN tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE;
CREATE INDEX idx_supplier_sources_tenant_id ON supplier_sources(tenant_id);

-- ===== ADD lat/lon TO budget_requests FOR GOOGLE SOLAR API =====
-- Populated during intake when the address is geocoded.
-- The Solar API uses these coordinates to fetch irradiation data.
ALTER TABLE budget_requests
  ADD COLUMN latitude NUMERIC(10, 7),
  ADD COLUMN longitude NUMERIC(10, 7);

-- ===== MIGRATE EXISTING DATA TO A DEFAULT TENANT =====
-- Creates a "Default" tenant and assigns all orphaned rows to it.
-- Safe to run on an empty or populated database.
DO $$
DECLARE
  v_tenant_id UUID;
BEGIN
  -- Only create a default tenant if there is existing data without a tenant
  IF EXISTS (
    SELECT 1 FROM leads WHERE tenant_id IS NULL
    UNION ALL
    SELECT 1 FROM supplier_sources WHERE tenant_id IS NULL
    LIMIT 1
  ) THEN
    INSERT INTO tenants (name, slug, plan, status)
    VALUES ('Default', 'default', 'starter', 'active')
    RETURNING id INTO v_tenant_id;

    UPDATE leads           SET tenant_id = v_tenant_id WHERE tenant_id IS NULL;
    UPDATE budget_requests SET tenant_id = v_tenant_id WHERE tenant_id IS NULL;
    UPDATE quote_versions  SET tenant_id = v_tenant_id WHERE tenant_id IS NULL;
    UPDATE supplier_sources SET tenant_id = v_tenant_id WHERE tenant_id IS NULL;
  END IF;
END $$;

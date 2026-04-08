CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ===== LEADS =====
CREATE TABLE leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name VARCHAR(255) NOT NULL,
  phone VARCHAR(30),
  email VARCHAR(255),
  city VARCHAR(120),
  state VARCHAR(10),
  address_text TEXT,
  source VARCHAR(50) NOT NULL DEFAULT 'manual',
  notes TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_leads_phone ON leads(phone);

-- ===== BUDGET REQUESTS =====
CREATE TABLE budget_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  status VARCHAR(30) NOT NULL DEFAULT 'pending',
  monthly_consumption_kwh NUMERIC(10,2),
  bill_amount_brl NUMERIC(12,2),
  utility_company VARCHAR(100),
  connection_type VARCHAR(50),
  installation_type VARCHAR(50),
  roof_type VARCHAR(50),
  notes TEXT,
  input_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_budget_requests_lead_id ON budget_requests(lead_id);
CREATE INDEX idx_budget_requests_status ON budget_requests(status);

-- ===== QUOTE VERSIONS =====
CREATE TABLE quote_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  budget_request_id UUID NOT NULL REFERENCES budget_requests(id) ON DELETE CASCADE,
  version_number INTEGER NOT NULL,
  status VARCHAR(30) NOT NULL DEFAULT 'draft',
  estimated_system_kwp NUMERIC(10,2),
  estimated_generation_kwh NUMERIC(12,2),
  estimated_savings_brl NUMERIC(12,2),
  estimated_price_brl NUMERIC(12,2),
  assumptions JSONB NOT NULL DEFAULT '{}'::jsonb,
  result_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (budget_request_id, version_number)
);

CREATE INDEX idx_quote_versions_budget_request_id
  ON quote_versions(budget_request_id);

-- ===== AUDIT LOGS =====
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type VARCHAR(50) NOT NULL,
  entity_id UUID,
  action VARCHAR(50) NOT NULL,
  actor_type VARCHAR(30) NOT NULL DEFAULT 'system',
  actor_id VARCHAR(100),
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_audit_logs_entity_type_entity_id 
  ON audit_logs(entity_type, entity_id);

CREATE INDEX idx_audit_logs_action 
  ON audit_logs(action);

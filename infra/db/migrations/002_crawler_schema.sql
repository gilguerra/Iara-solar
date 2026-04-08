-- ===== SUPPLIER SOURCES =====
CREATE TABLE supplier_sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(50) NOT NULL UNIQUE,
  name VARCHAR(255) NOT NULL,
  base_url TEXT,
  status VARCHAR(30) NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_supplier_sources_status ON supplier_sources(status);

-- ===== CRAWL RUNS =====
CREATE TABLE crawl_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_source_id UUID NOT NULL REFERENCES supplier_sources(id) ON DELETE CASCADE,
  status VARCHAR(30) NOT NULL DEFAULT 'running',
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  finished_at TIMESTAMPTZ,
  items_found INTEGER NOT NULL DEFAULT 0,
  items_inserted INTEGER NOT NULL DEFAULT 0,
  items_updated INTEGER NOT NULL DEFAULT 0,
  error_message TEXT,
  meta JSONB NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX idx_crawl_runs_supplier_source_id ON crawl_runs(supplier_source_id);
CREATE INDEX idx_crawl_runs_status ON crawl_runs(status);
CREATE INDEX idx_crawl_runs_started_at ON crawl_runs(started_at DESC);

-- ===== SUPPLIER KITS =====
CREATE TABLE supplier_kits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_source_id UUID NOT NULL REFERENCES supplier_sources(id) ON DELETE CASCADE,
  supplier_kit_code VARCHAR(120),
  supplier_kit_name TEXT NOT NULL,
  brand_module VARCHAR(120),
  brand_inverter VARCHAR(120),
  module_power_w NUMERIC(10,2),
  module_quantity INTEGER,
  inverter_power_kw NUMERIC(10,2),
  kit_power_kwp NUMERIC(10,2),
  phase_type VARCHAR(30),
  system_type VARCHAR(30),
  structure_type VARCHAR(50),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  raw_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_supplier_kits_supplier_source_id ON supplier_kits(supplier_source_id);
CREATE INDEX idx_supplier_kits_supplier_kit_code ON supplier_kits(supplier_kit_code);
CREATE INDEX idx_supplier_kits_kit_power_kwp ON supplier_kits(kit_power_kwp);
CREATE INDEX idx_supplier_kits_is_active ON supplier_kits(is_active);

CREATE UNIQUE INDEX ux_supplier_kits_source_code
  ON supplier_kits(supplier_source_id, supplier_kit_code)
  WHERE supplier_kit_code IS NOT NULL;

-- ===== SUPPLIER KIT PRICES =====
CREATE TABLE supplier_kit_prices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_kit_id UUID NOT NULL REFERENCES supplier_kits(id) ON DELETE CASCADE,
  crawl_run_id UUID NOT NULL REFERENCES crawl_runs(id) ON DELETE CASCADE,
  price_cash_brl NUMERIC(12,2),
  price_term_brl NUMERIC(12,2),
  availability_text TEXT,
  availability_status VARCHAR(30),
  captured_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_supplier_kit_prices_supplier_kit_id ON supplier_kit_prices(supplier_kit_id);
CREATE INDEX idx_supplier_kit_prices_crawl_run_id ON supplier_kit_prices(crawl_run_id);
CREATE INDEX idx_supplier_kit_prices_captured_at ON supplier_kit_prices(captured_at DESC);

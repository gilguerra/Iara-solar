-- Seed: BlueSun supplier + 4 solar kits with pricing
-- Requires: migration 003 to have been applied (tenants table must exist)
-- Run after creating your first tenant, or let the DO block below
-- use the 'default' tenant created automatically by migration 003.

DO $$
DECLARE
  v_tenant_id    UUID;
  v_supplier_id  UUID;
BEGIN
  -- Use the 'default' tenant (created by migration 003) or fail loudly
  SELECT id INTO v_tenant_id FROM tenants WHERE slug = 'default' LIMIT 1;

  IF v_tenant_id IS NULL THEN
    RAISE EXCEPTION 'No tenant with slug "default" found. Run migration 003 first.';
  END IF;

  -- Insert supplier source
  INSERT INTO supplier_sources (id, tenant_id, code, name, base_url, status)
  VALUES (
    '23d9b8b5-a93d-40e2-af85-d6f2304c3c6a',
    v_tenant_id,
    'bluesun',
    'BlueSun Energia Solar',
    'https://bluesun.com.br',
    'active'
  )
  ON CONFLICT (id) DO NOTHING
  RETURNING id INTO v_supplier_id;

  -- If already existed, fetch the id
  IF v_supplier_id IS NULL THEN
    SELECT id INTO v_supplier_id FROM supplier_sources WHERE id = '23d9b8b5-a93d-40e2-af85-d6f2304c3c6a';
  END IF;

  -- Insert crawl run + kits + prices in a single CTE chain
  WITH inserted_run AS (
    INSERT INTO crawl_runs (
      supplier_source_id, status, started_at, finished_at,
      items_found, items_inserted, items_updated, meta
    )
    VALUES (
      v_supplier_id,
      'success',
      NOW() - INTERVAL '5 minutes',
      NOW(),
      4, 4, 0,
      jsonb_build_object('mode', 'seed', 'note', 'Carga inicial fictícia para testes')
    )
    RETURNING id
  ),

  inserted_kits AS (
    INSERT INTO supplier_kits (
      supplier_source_id, supplier_kit_code, supplier_kit_name,
      brand_module, brand_inverter, module_power_w, module_quantity,
      inverter_power_kw, kit_power_kwp, phase_type, system_type,
      structure_type, is_active, raw_payload
    )
    VALUES
      (v_supplier_id, 'BS-KIT-5000-01', 'Kit Solar BlueSun 5,04 kWp Growatt Monofásico',
       'JA Solar', 'Growatt', 560, 9, 5.0, 5.04, 'monofasico', 'on-grid', 'telhado',
       TRUE, jsonb_build_object('seed', true, 'supplier_name', 'BlueSun')),
      (v_supplier_id, 'BS-KIT-6600-01', 'Kit Solar BlueSun 6,72 kWp Sungrow Trifásico',
       'Canadian Solar', 'Sungrow', 560, 12, 6.0, 6.72, 'trifasico', 'on-grid', 'telhado',
       TRUE, jsonb_build_object('seed', true, 'supplier_name', 'BlueSun')),
      (v_supplier_id, 'BS-KIT-7400-01', 'Kit Solar BlueSun 7,28 kWp Growatt Trifásico',
       'Longi', 'Growatt', 560, 13, 7.5, 7.28, 'trifasico', 'on-grid', 'telhado',
       TRUE, jsonb_build_object('seed', true, 'supplier_name', 'BlueSun')),
      (v_supplier_id, 'BS-KIT-10000-01', 'Kit Solar BlueSun 10,08 kWp Sungrow Trifásico',
       'JA Solar', 'Sungrow', 560, 18, 10.0, 10.08, 'trifasico', 'on-grid', 'telhado',
       TRUE, jsonb_build_object('seed', true, 'supplier_name', 'BlueSun'))
    ON CONFLICT (supplier_source_id, supplier_kit_code) DO NOTHING
    RETURNING id, supplier_kit_code
  )

  INSERT INTO supplier_kit_prices (
    supplier_kit_id, crawl_run_id,
    price_cash_brl, price_term_brl,
    availability_text, availability_status, captured_at
  )
  SELECT
    k.id,
    r.id,
    CASE k.supplier_kit_code
      WHEN 'BS-KIT-5000-01'  THEN 14890.00
      WHEN 'BS-KIT-6600-01'  THEN 18990.00
      WHEN 'BS-KIT-7400-01'  THEN 21490.00
      WHEN 'BS-KIT-10000-01' THEN 28990.00
    END,
    CASE k.supplier_kit_code
      WHEN 'BS-KIT-5000-01'  THEN 15690.00
      WHEN 'BS-KIT-6600-01'  THEN 19990.00
      WHEN 'BS-KIT-7400-01'  THEN 22690.00
      WHEN 'BS-KIT-10000-01' THEN 30490.00
    END,
    'Em estoque',
    'in_stock',
    NOW()
  FROM inserted_kits k
  CROSS JOIN inserted_run r;
END $$;

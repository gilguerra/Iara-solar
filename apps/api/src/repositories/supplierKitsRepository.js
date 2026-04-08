import { pgPool } from '../lib/postgres.js';

export async function listSupplierKits(tenantId) {
  const query = `
    SELECT
      sk.id,
      sk.supplier_kit_code,
      sk.supplier_kit_name,
      sk.brand_module,
      sk.brand_inverter,
      sk.module_power_w,
      sk.module_quantity,
      sk.inverter_power_kw,
      sk.kit_power_kwp,
      sk.phase_type,
      sk.system_type,
      sk.structure_type,
      sk.is_active,
      sk.created_at,
      sk.updated_at,
      ss.code AS supplier_code,
      ss.name AS supplier_name,
      skp.price_cash_brl,
      skp.price_term_brl,
      skp.availability_text,
      skp.availability_status,
      skp.captured_at
    FROM supplier_kits sk
    JOIN supplier_sources ss ON ss.id = sk.supplier_source_id
    LEFT JOIN LATERAL (
      SELECT
        price_cash_brl,
        price_term_brl,
        availability_text,
        availability_status,
        captured_at
      FROM supplier_kit_prices
      WHERE supplier_kit_id = sk.id
      ORDER BY captured_at DESC
      LIMIT 1
    ) skp ON true
    WHERE sk.is_active = true
      AND ss.tenant_id = $1
    ORDER BY sk.kit_power_kwp ASC, sk.created_at DESC
  `;

  const result = await pgPool.query(query, [tenantId]);
  return result.rows;
}

export async function findMatchingSupplierKits(targetKwp, tenantId, limit = 3) {
  const query = `
    SELECT
      sk.id,
      sk.supplier_kit_code,
      sk.supplier_kit_name,
      sk.brand_module,
      sk.brand_inverter,
      sk.module_power_w,
      sk.module_quantity,
      sk.inverter_power_kw,
      sk.kit_power_kwp,
      sk.phase_type,
      sk.system_type,
      sk.structure_type,
      ss.code AS supplier_code,
      ss.name AS supplier_name,
      skp.price_cash_brl,
      skp.price_term_brl,
      skp.availability_text,
      skp.availability_status,
      skp.captured_at,
      ABS(sk.kit_power_kwp - $1) AS kwp_distance
    FROM supplier_kits sk
    JOIN supplier_sources ss ON ss.id = sk.supplier_source_id
    LEFT JOIN LATERAL (
      SELECT
        price_cash_brl,
        price_term_brl,
        availability_text,
        availability_status,
        captured_at
      FROM supplier_kit_prices
      WHERE supplier_kit_id = sk.id
      ORDER BY captured_at DESC
      LIMIT 1
    ) skp ON true
    WHERE sk.is_active = true
      AND ss.tenant_id = $2
    ORDER BY ABS(sk.kit_power_kwp - $1) ASC, sk.kit_power_kwp ASC
    LIMIT $3
  `;

  const result = await pgPool.query(query, [targetKwp, tenantId, limit]);
  return result.rows;
}

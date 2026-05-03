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

/**
 * Selects the single best kit for a client's estimated need.
 *
 * Selection logic:
 *   1. Kit must cover at least the calculated need accounting for up to 60%
 *      system overload — i.e. kit_power_kwp >= needed_kwp / 1.6
 *      (a 3 kWp kit can serve a 3 * 1.6 = 4.8 kWp need in practice)
 *   2. Kit should not exceed 60% oversize vs the calculated need
 *      — i.e. kit_power_kwp <= needed_kwp * 1.6
 *   3. Among qualifying kits, the cheapest cash price wins.
 *   4. Fallback: if no kit falls in that window, pick the cheapest kit
 *      that is at least needed_kwp / 1.6 (covers the need with max overload).
 *
 * @param {number} neededKwp  — estimated system size from quote generation
 * @param {string} tenantId
 * @returns {Promise<object|null>}
 */
export async function selectBestKit(neededKwp, tenantId) {
  const kitFields = `
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
    ss.code  AS supplier_code,
    ss.name  AS supplier_name,
    skp.price_cash_brl,
    skp.price_term_brl,
    skp.availability_text,
    skp.availability_status,
    skp.captured_at
  `;

  const lateralPrice = `
    LEFT JOIN LATERAL (
      SELECT price_cash_brl, price_term_brl, availability_text,
             availability_status, captured_at
      FROM supplier_kit_prices
      WHERE supplier_kit_id = sk.id
      ORDER BY captured_at DESC
      LIMIT 1
    ) skp ON true
  `;

  // Primary: cheapest kit within the 30-60% overload window
  const primaryQuery = `
    SELECT ${kitFields}
    FROM supplier_kits sk
    JOIN supplier_sources ss ON ss.id = sk.supplier_source_id
    ${lateralPrice}
    WHERE sk.is_active = true
      AND ss.tenant_id = $2
      AND sk.kit_power_kwp >= $1 / 1.6
      AND sk.kit_power_kwp <= $1 * 1.6
    ORDER BY skp.price_cash_brl ASC NULLS LAST, sk.kit_power_kwp ASC
    LIMIT 1
  `;

  const primary = await pgPool.query(primaryQuery, [neededKwp, tenantId]);
  if (primary.rowCount > 0) return primary.rows[0];

  // Fallback: cheapest kit that at least covers the need with max overload
  const fallbackQuery = `
    SELECT ${kitFields}
    FROM supplier_kits sk
    JOIN supplier_sources ss ON ss.id = sk.supplier_source_id
    ${lateralPrice}
    WHERE sk.is_active = true
      AND ss.tenant_id = $2
      AND sk.kit_power_kwp >= $1 / 1.6
    ORDER BY skp.price_cash_brl ASC NULLS LAST, sk.kit_power_kwp ASC
    LIMIT 1
  `;

  const fallback = await pgPool.query(fallbackQuery, [neededKwp, tenantId]);
  return fallback.rows[0] ?? null;
}

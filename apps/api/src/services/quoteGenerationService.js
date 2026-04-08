import { getSolarIrradiation } from './solarIrradiationService.js';

/**
 * Generates a pre-quote estimate from a budget request.
 *
 * Uses the Google Solar API (via solarIrradiationService) when coordinates
 * are available and the API key is configured; falls back to the Brazilian
 * average irradiation otherwise.
 *
 * @param {object} budgetRequest  Row from budget_requests joined with lead.
 * @returns {Promise<object>}
 */
export async function generatePreQuote(budgetRequest) {
  const monthlyConsumption = Number(budgetRequest.monthly_consumption_kwh ?? 0);
  const billAmount = Number(budgetRequest.bill_amount_brl ?? 0);

  if (!monthlyConsumption || monthlyConsumption <= 0) {
    throw new Error('monthly_consumption_kwh is required to generate quote');
  }

  const irradiation = await getSolarIrradiation({
    latitude: budgetRequest.latitude ?? null,
    longitude: budgetRequest.longitude ?? null,
  });

  const monthlyKwhPerKwp = irradiation.monthly_kwh_per_kwp;

  const estimatedSystemKwp = Number((monthlyConsumption / monthlyKwhPerKwp).toFixed(2));
  const estimatedGenerationKwh = Number((estimatedSystemKwp * monthlyKwhPerKwp).toFixed(2));
  const estimatedSavingsBrl = Number((billAmount * 0.9).toFixed(2));
  const estimatedPriceBrl = Number((estimatedSystemKwp * 4500).toFixed(2));

  const assumptions = {
    irradiation_source: irradiation.source,
    peak_sun_hours_per_day: irradiation.peak_sun_hours_per_day,
    monthly_kwh_per_kwp: monthlyKwhPerKwp,
    price_per_kwp_brl: 4500,
    savings_factor: 0.9,
    model: 'pre_quote_v1',
  };

  const resultPayload = {
    lead_name: budgetRequest.lead_full_name,
    utility_company: budgetRequest.utility_company,
    connection_type: budgetRequest.connection_type,
    installation_type: budgetRequest.installation_type,
    roof_type: budgetRequest.roof_type,
    source_budget_request_id: budgetRequest.id,
  };

  return {
    estimated_system_kwp: estimatedSystemKwp,
    estimated_generation_kwh: estimatedGenerationKwh,
    estimated_savings_brl: estimatedSavingsBrl,
    estimated_price_brl: estimatedPriceBrl,
    assumptions,
    result_payload: resultPayload,
  };
}

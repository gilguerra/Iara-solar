import { env } from '../config/env.js';

/**
 * Google Solar API — Building Insights endpoint.
 * Docs: https://developers.google.com/maps/documentation/solar/reference/rest/v1/buildingInsights/findClosest
 *
 * Returns irradiation data for a given location. Falls back to the
 * Brazilian average (4.5 peak sun hours/day) when coordinates are not
 * provided or the API key is not configured.
 *
 * TODO: Replace the stub section below with the real fetch call once
 * GOOGLE_SOLAR_API_KEY is set in your .env.
 *
 * @param {{ latitude?: number|null, longitude?: number|null }} location
 * @returns {Promise<{
 *   source: string,
 *   peak_sun_hours_per_day: number,
 *   annual_kwh_per_kwp: number,
 *   monthly_kwh_per_kwp: number,
 * }>}
 */
export async function getSolarIrradiation({ latitude, longitude } = {}) {
  const hasCoordinates = latitude != null && longitude != null;
  const hasApiKey = Boolean(env.googleSolarApiKey);

  if (hasCoordinates && hasApiKey) {
    // ---------------------------------------------------------------
    // TODO: Implement the real Google Solar API call here.
    //
    // const url =
    //   `https://solar.googleapis.com/v1/buildingInsights:findClosest` +
    //   `?location.latitude=${latitude}` +
    //   `&location.longitude=${longitude}` +
    //   `&requiredQuality=HIGH` +
    //   `&key=${env.googleSolarApiKey}`;
    //
    // const response = await fetch(url);
    // if (!response.ok) {
    //   // Fall through to Brazilian average on API error
    //   return brazilAverage('google_solar_api_error');
    // }
    // const data = await response.json();
    // const peakSunHours = data.solarPotential?.maxSunshineHoursPerYear / 365;
    // return {
    //   source: 'google_solar_api',
    //   peak_sun_hours_per_day: peakSunHours,
    //   annual_kwh_per_kwp: Number((peakSunHours * 365).toFixed(2)),
    //   monthly_kwh_per_kwp: Number((peakSunHours * 30).toFixed(2)),
    // };
    // ---------------------------------------------------------------

    // Stub: API key is set and coordinates exist, but call not yet implemented.
    // Returns Brazil average tagged as stub so you can see it in quote assumptions.
    return brazilAverage('stub_google_solar_api');
  }

  return brazilAverage('fallback_brazil_average');
}

function brazilAverage(source) {
  // Brazil average: ~4.5 peak sun hours/day
  // Source: INMET / CRESESB atlas
  const peakSunHoursPerDay = 4.5;
  return {
    source,
    peak_sun_hours_per_day: peakSunHoursPerDay,
    annual_kwh_per_kwp: Number((peakSunHoursPerDay * 365).toFixed(2)),
    monthly_kwh_per_kwp: Number((peakSunHoursPerDay * 30).toFixed(2)),
  };
}

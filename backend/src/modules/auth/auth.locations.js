import {
  countries,
  getNormalizedCitySearchIndex,
  normalizeLocation,
} from '@web-platform/shared/location-catalog.js';

const CITY_RESULTS_LIMIT = 25;

setImmediate(() => {
  for (const countryCode of ['ES', 'US', 'IN', 'CO', 'MX', 'AR']) {
    getNormalizedCitySearchIndex(countryCode);
  }
});

export const listCountries = () => countries;

export const searchCities = (countryCode, query) => {
  const countryExists = countries.some(({ code }) => code === countryCode);
  if (!countryExists) return [];

  const normalizedQuery = normalizeLocation(query);
  const results = [];
  const seen = new Set();

  for (const [normalizedName, name] of getNormalizedCitySearchIndex(countryCode)) {
    if (!normalizedName.includes(normalizedQuery) || seen.has(normalizedName)) {
      continue;
    }
    seen.add(normalizedName);
    results.push(name);
    if (results.length === CITY_RESULTS_LIMIT) break;
  }

  return results;
};

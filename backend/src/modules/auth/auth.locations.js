import {
  countries,
  getCityNames,
  normalizeLocation,
} from '../../../../shared/location-catalog.js';

const CITY_RESULTS_LIMIT = 25;

export const listCountries = () => countries;

export const searchCities = (countryCode, query) => {
  const countryExists = countries.some(({ code }) => code === countryCode);
  if (!countryExists) return [];

  const normalizedQuery = normalizeLocation(query);
  const results = [];
  const seen = new Set();

  for (const name of getCityNames(countryCode)) {
    const normalizedName = normalizeLocation(name);
    if (!normalizedName.includes(normalizedQuery) || seen.has(normalizedName)) {
      continue;
    }
    seen.add(normalizedName);
    results.push(name);
    if (results.length === CITY_RESULTS_LIMIT) break;
  }

  return results;
};

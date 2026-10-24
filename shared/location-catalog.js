import { City, Country } from 'country-state-city';

const countryNames = new Intl.DisplayNames(['es'], { type: 'region' });

export const normalizeLocation = (value) =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase()
    .trim();

export const countries = Country.getAllCountries()
  .map(({ isoCode, name }) => ({
    code: isoCode,
    name: countryNames.of(isoCode) || name,
  }))
  .sort((a, b) => a.name.localeCompare(b.name, 'es'));

const countryByName = new Map(
  countries.map(({ code, name }) => [normalizeLocation(name), code]),
);
const cityNamesByCountry = new Map();
const cityNameSetsByCountry = new Map();

export const getCountryCode = (name) =>
  countryByName.get(normalizeLocation(name));

export const getCities = (countryCode) => City.getCitiesOfCountry(countryCode) ?? [];

export const getCityNames = (countryCode) => {
  if (!cityNamesByCountry.has(countryCode)) {
    const names = [
      ...new Set(getCities(countryCode).map(({ name }) => name)),
    ].sort((a, b) => a.localeCompare(b));
    cityNamesByCountry.set(countryCode, names);
    cityNameSetsByCountry.set(
      countryCode,
      new Set(names.map(normalizeLocation)),
    );
  }
  return cityNamesByCountry.get(countryCode);
};

export const isValidCity = (countryCode, cityName) => {
  getCityNames(countryCode);
  return cityNameSetsByCountry
    .get(countryCode)
    .has(normalizeLocation(cityName));
};

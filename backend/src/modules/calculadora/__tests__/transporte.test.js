import { readFileSync } from 'node:fs';
import { describe, expect, test } from 'vitest';
import { calcularTransporte } from '../modulos/transporte.js';

const leer = (archivo) => JSON.parse(readFileSync(new URL(`../data/${archivo}`, import.meta.url), 'utf8'));
const contexto = {
  factores: leer('reference_factors.json'),
  vehiculos: leer('vehiculos.json'),
  factorElectrico: { valor: 0.2, incertidumbreRelativa: 0.3 },
};

const coche = (datos) => calcularTransporte({ coche: { ocupacion: 1, ...datos } }, contexto);

describe('coche', () => {
  test('gasolina: litros anuales × factor', () => {
    expect(coche({ km: 10000, energia: 'gasolina', consumo: 6 }).totalKg).toBeCloseTo(600 * 2.249);
  });

  test('el híbrido convencional usa el factor de su combustible', () => {
    expect(coche({ km: 10000, energia: 'hibrido_diesel', consumo: 4 }).totalKg).toBeCloseTo(400 * 2.517);
  });

  test('reparte las emisiones entre la ocupación media', () => {
    const solo = coche({ km: 10000, energia: 'diesel', consumo: 5 }).totalKg;
    expect(coche({ km: 10000, energia: 'diesel', consumo: 5, ocupacion: 2 }).totalKg).toBeCloseTo(solo / 2);
  });

  test('eléctrico: aplica pérdidas de carga si el dato no viene del contador', () => {
    const base = { km: 10000, energia: 'electrico', consumo: 15 };
    expect(coche({ ...base, origenConsumoElectrico: 'contador_punto_carga' }).totalKg).toBeCloseTo(1500 * 0.2);
    expect(coche(base).totalKg).toBeCloseTo(1500 * 1.1 * 0.2);
  });

  test('eléctrico: no vuelve a sumar la carga ya incluida en Vivienda', () => {
    const base = { km: 10000, energia: 'electrico', consumo: 15, origenConsumoElectrico: 'contador_punto_carga' };
    expect(coche({ ...base, cargaIncluidaVivienda: 'si' }).totalKg).toBe(0);
    expect(coche({ ...base, cargaIncluidaVivienda: 'parcial', porcentajeCargaIncluida: 40 }).totalKg).toBeCloseTo(1500 * 0.6 * 0.2);
  });

  test('híbrido enchufable: separa kilómetros eléctricos y térmicos', () => {
    const resultado = coche({
      km: 10000,
      energia: 'hibrido_enchufable',
      consumo: 18,
      origenConsumoElectrico: 'contador_punto_carga',
      enchufable: { combustibleTermico: 'gasolina', porcentajeKmElectrico: 50, consumoCombustible: 6 },
    });
    expect(resultado.partidas.map(({ id }) => id)).toEqual(['coche_electrico', 'coche_termico']);
    expect(resultado.totalKg).toBeCloseTo(900 * 0.2 + 300 * 2.249);
  });
});

describe('moto y transporte público', () => {
  test('moto: km × factor por tipo', () => {
    expect(calcularTransporte({ moto: { km: 1000, tipo: 'moto_grande' } }, contexto).totalKg).toBeCloseTo(132.52);
  });

  test('suma los modos públicos y usa el tipo de tren elegido', () => {
    const resultado = calcularTransporte({ publico: { metro: 1000, tren: 1000, tipoTren: 'tren_diesel' } }, contexto);
    expect(resultado.totalKg).toBeCloseTo(27.8 + 106);
  });

  test('sin datos el transporte es cero', () => {
    expect(calcularTransporte({}, contexto)).toMatchObject({ totalKg: 0, incertidumbreKg: 0, partidas: [] });
  });
});

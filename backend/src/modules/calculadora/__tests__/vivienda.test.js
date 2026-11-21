import { readFileSync } from 'node:fs';
import { describe, expect, test } from 'vitest';
import { calcularVivienda } from '../modulos/vivienda.js';

const factores = JSON.parse(readFileSync(new URL('../data/reference_factors.json', import.meta.url), 'utf8'));
const red = { valor: 0.2, incertidumbreRelativa: 0.3 };
const contexto = { factores, factorElectrico: red, factorElectricoRed: red };

describe('calcularVivienda', () => {
  test('reparte el consumo del hogar entre las personas residentes', () => {
    const resultado = calcularVivienda({ personas: 2, consumos: { electricidad: { valor: 3000, unidad: 'kWh_anual' } } }, contexto);
    expect(resultado.hogarKg).toBeCloseTo(600);
    expect(resultado.totalKg).toBeCloseTo(300);
  });

  test('convierte los m³ de gas natural a kWh antes de aplicar el factor', () => {
    const resultado = calcularVivienda({ personas: 1, consumos: { gas: { valor: 100, unidad: 'm3_anual' } } }, contexto);
    expect(resultado.totalKg).toBeCloseTo(100 * 11.7 * 0.182);
  });

  test('calcula el propano por kg aunque se introduzca en litros', () => {
    const resultado = calcularVivienda({ personas: 1, consumos: { propano: { valor: 100, unidad: 'litros_anual' } } }, contexto);
    expect(resultado.totalKg).toBeCloseTo(100 * 0.51 * 2.938);
  });

  test('ignora las fuentes vacías y devuelve cero sin consumos', () => {
    const resultado = calcularVivienda({ personas: 3, consumos: { gas: { valor: 0, unidad: 'kWh_anual' } } }, contexto);
    expect(resultado.totalKg).toBe(0);
    expect(resultado.partidas).toEqual([]);
  });

  test('el factor personalizado cambia la electricidad pero no la compensación fotovoltaica', () => {
    const personalizado = { valor: 0.05, incertidumbreRelativa: 0.15 };
    const resultado = calcularVivienda(
      { personas: 1, consumos: { electricidad: { valor: 1000, unidad: 'kWh_anual' } }, excedenteFotovoltaicoKWh: 500 },
      { ...contexto, factorElectrico: personalizado },
    );
    expect(resultado.totalKg).toBeCloseTo(50);
    expect(resultado.compensacionFotovoltaicaKg).toBeCloseTo(100);
    expect(resultado.netoOrientativoKg).toBe(0);
  });

  test('un dato estimado tiene más incertidumbre que uno de factura', () => {
    const entrada = { personas: 1, consumos: { gasoleo: { valor: 500, unidad: 'litros_anual' } } };
    const factura = calcularVivienda(entrada, contexto);
    const estimado = calcularVivienda({ ...entrada, origenDato: 'estimado' }, contexto);
    expect(estimado.totalKg).toBeCloseTo(factura.totalKg);
    expect(estimado.incertidumbreKg).toBeGreaterThan(factura.incertidumbreKg);
  });
});

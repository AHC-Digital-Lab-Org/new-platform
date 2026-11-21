import { readFileSync } from 'node:fs';
import { describe, expect, test } from 'vitest';
import { calcularVuelos, haversineKm, seleccionarTramoDistancia } from '../modulos/vuelos.js';

const factores = JSON.parse(readFileSync(new URL('../data/reference_factors.json', import.meta.url), 'utf8'));
const aeropuertos = JSON.parse(readFileSync(new URL('../data/vuelos.json', import.meta.url), 'utf8'));
const contexto = {
  factores,
  aeropuertoPorCodigo: (codigo) => aeropuertos.find((aeropuerto) => aeropuerto.codigo === codigo),
};

const viaje = (tramos, extra = {}) => ({ clase: 'economica', itinerario: 'solo_ida', veces: 1, tramos, ...extra });

describe('calcularVuelos', () => {
  test('clasifica la distancia por tramos del factor', () => {
    expect(seleccionarTramoDistancia(400, factores.vuelos.factores_por_distancia).id).toBe('corto');
    expect(seleccionarTramoDistancia(500, factores.vuelos.factores_por_distancia).id).toBe('medio');
    expect(seleccionarTramoDistancia(9000, factores.vuelos.factores_por_distancia).id).toBe('muy_largo');
  });

  test('lectura directa: km × factor por distancia', () => {
    const resultado = calcularVuelos({ criterio: 'directo', viajes: [viaje([{ modo: 'km', km: 1000 }])] }, contexto);
    expect(resultado.totalKg).toBeCloseTo(1000 * 0.07435);
  });

  test('la lectura ampliada aplica una sola vez el multiplicador no-CO₂', () => {
    const resultado = calcularVuelos({ viajes: [viaje([{ modo: 'km', km: 1000 }])] }, contexto);
    expect(resultado.criterio).toBe('ampliado');
    expect(resultado.totalKg).toBeCloseTo(resultado.directoKg * 1.7);
  });

  test('ida y vuelta, repeticiones y clase multiplican el resultado', () => {
    const base = calcularVuelos({ criterio: 'directo', viajes: [viaje([{ modo: 'km', km: 6000 }])] }, contexto).totalKg;
    const resultado = calcularVuelos({
      criterio: 'directo',
      viajes: [viaje([{ modo: 'km', km: 6000 }], { itinerario: 'ida_y_vuelta', veces: 2, clase: 'business' })],
    }, contexto);
    expect(resultado.totalKg).toBeCloseTo(base * 2 * 2 * 2.9);
  });

  test('estima la distancia entre aeropuertos y a partir de horas de vuelo', () => {
    const mad = contexto.aeropuertoPorCodigo('MAD');
    const cdg = contexto.aeropuertoPorCodigo('CDG');
    expect(haversineKm(mad, cdg)).toBeGreaterThan(1000);
    expect(haversineKm(mad, cdg)).toBeLessThan(1100);
    const porHoras = calcularVuelos({ viajes: [viaje([{ modo: 'horas', horas: 2 }])] }, contexto);
    expect(porHoras.partidas[0].detalle.kmPorTrayecto).toBe(1600);
  });

  test('sin viajes la huella de vuelos es cero', () => {
    expect(calcularVuelos({ viajes: [] }, contexto)).toMatchObject({ totalKg: 0, directoKg: 0, ampliadoKg: 0 });
  });
});

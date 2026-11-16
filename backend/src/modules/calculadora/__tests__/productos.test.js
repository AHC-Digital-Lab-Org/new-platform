import { readFileSync } from 'node:fs';
import { describe, expect, test } from 'vitest';
import { calcularProductos } from '../modulos/productos.js';

const factores = JSON.parse(readFileSync(new URL('../data/reference_factors.json', import.meta.url), 'utf8'));
const calcular = (entrada) => calcularProductos(entrada, { factores });

describe('calcularProductos', () => {
  test('anualiza un gasto recurrente y lo ajusta a la base del factor', () => {
    const resultado = calcular({ gastos: { ropa_textiles_calzado: { importe: 50, frecuencia: 'mensual' } } });
    expect(resultado.totalKg).toBeCloseTo(50 * 12 * 0.9 * 0.6);
  });

  test('el perfil alimentario solo modula la comida', () => {
    const gastos = { comida_bebida: { importe: 100, frecuencia: 'mensual' }, restaurantes: { importe: 100, frecuencia: 'mensual' } };
    const media = calcular({ gastos });
    const vegana = calcular({ gastos, dieta: 'vegana' });
    const restaurantes = (resultado) => resultado.partidas.find(({ id }) => id === 'restaurantes').kg;
    expect(vegana.partidas[0].kg).toBeCloseTo(media.partidas[0].kg * 0.55);
    expect(restaurantes(vegana)).toBeCloseTo(restaurantes(media));
  });

  test('reparte un producto duradero por su vida útil (por defecto o indicada)', () => {
    const porDefecto = calcular({ gastos: { computadoras: { importe: 1000 } } });
    expect(porDefecto.totalKg).toBeCloseTo((1000 * 0.9 * 0.4) / 4);
    expect(porDefecto.partidas[0].detalle.vidaUtil).toBe(4);
    expect(calcular({ gastos: { computadoras: { importe: 1000, vidaUtil: 8 } } }).totalKg).toBeCloseTo(porDefecto.totalKg / 2);
  });

  test('convierte dólares a euros antes de aplicar el factor', () => {
    const euros = calcular({ gastos: { educacion: { importe: 117, frecuencia: 'anual' } } });
    const dolares = calcular({ moneda: 'USD', gastos: { educacion: { importe: 117, frecuencia: 'anual' } } });
    expect(dolares.totalKg).toBeCloseTo(euros.totalKg / 1.17);
  });

  test('sin gastos el consumo es cero', () => {
    expect(calcular({ gastos: {} })).toMatchObject({ totalKg: 0, partidas: [] });
  });
});

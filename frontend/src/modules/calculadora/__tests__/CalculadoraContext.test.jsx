import { act, cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { aDatosApi, aNumero, CalculadoraProvider, construirEntrada, formularioInicial, useCalculadora } from '../CalculadoraContext.jsx';
import * as api from '../api.js';

vi.mock('../api.js', () => ({
  getFactores: vi.fn(() => Promise.resolve({})),
  calcularModulo: vi.fn(() => Promise.resolve({ modulo: 'vivienda', totalKg: 1234, incertidumbreKg: 10, partidas: [] })),
  calcularHuella: vi.fn(),
}));

describe('conversión del formulario a datos de la API', () => {
  test('acepta coma decimal y distingue vacío de no válido', () => {
    expect(aNumero('1,5')).toBe(1.5);
    expect(aNumero(' 1 200 ')).toBe(1200);
    expect(aNumero('')).toBeUndefined();
    expect(aNumero('abc')).toBeNaN();
  });

  test('vivienda: solo envía la electricidad y las calefacciones marcadas con valor', () => {
    const vivienda = formularioInicial().vivienda;
    vivienda.consumos.electricidad.valor = '3000';
    vivienda.consumos.gas = { valor: '500', unidad: 'm3_anual' };
    vivienda.consumos.gasoleo.valor = '200';
    vivienda.calefaccion = ['gas'];
    expect(aDatosApi.vivienda(vivienda).consumos).toEqual({
      electricidad: { valor: 3000, unidad: 'kWh_anual' },
      gas: { valor: 500, unidad: 'm3_anual' },
    });
  });

  test('transporte: pasa los km semanales a anuales y usa el consumo orientativo si falta', () => {
    const transporte = formularioInicial().transporte;
    transporte.usaCoche = true;
    transporte.coche = { ...transporte.coche, km: '100', periodo: 'semana', consumoOrientativo: 6.5 };
    transporte.publico = { ...transporte.publico, metro: '20', periodo: 'mes' };
    const datos = aDatosApi.transporte(transporte);
    expect(datos.coche).toMatchObject({ km: 5200, consumo: 6.5, ocupacion: 1 });
    expect(datos.publico).toEqual({ metro: 240, tipoTren: 'tren_nacional' });
    expect(datos.moto).toBeUndefined();
  });

  test('vuelos: ignora viajes incompletos y no envía viajes si no ha volado', () => {
    const vuelos = {
      sinVuelos: false,
      criterio: 'ampliado',
      viajes: [
        { modo: 'aeropuertos', origen: 'MAD', destino: 'CDG', clase: 'economica', itinerario: 'ida_y_vuelta', veces: '2' },
        { modo: 'aeropuertos', origen: 'MAD', destino: '', clase: 'economica', itinerario: 'solo_ida', veces: '1' },
      ],
    };
    expect(aDatosApi.vuelos(vuelos).viajes).toEqual([
      { clase: 'economica', itinerario: 'ida_y_vuelta', veces: 2, tramos: [{ modo: 'aeropuertos', origen: 'MAD', destino: 'CDG' }] },
    ]);
    expect(aDatosApi.vuelos({ ...vuelos, sinVuelos: true }).viajes).toEqual([]);
  });

  test('la entrada completa solo incluye los apartados visitados', () => {
    const entrada = construirEntrada(formularioInicial(), ['vivienda', 'vuelos']);
    expect(Object.keys(entrada)).toEqual(['general', 'vivienda', 'vuelos']);
  });
});

function Sonda() {
  const { formulario, totalEnVivoKg, actualizar, marcarVisitado } = useCalculadora();
  return (
    <div>
      <span data-testid="personas">{formulario.vivienda.personas}</span>
      <span data-testid="total">{totalEnVivoKg}</span>
      <button type="button" onClick={() => actualizar('vivienda', { personas: 4 })}>cambiar</button>
      <button type="button" onClick={() => marcarVisitado('vivienda')}>visitar</button>
    </div>
  );
}

describe('CalculadoraProvider', () => {
  beforeEach(() => {
    sessionStorage.clear();
    vi.useFakeTimers();
  });
  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  test('conserva las respuestas en la pestaña al volver a montar', () => {
    const { unmount } = render(<CalculadoraProvider><Sonda /></CalculadoraProvider>);
    act(() => screen.getByText('cambiar').click());
    unmount();
    render(<CalculadoraProvider><Sonda /></CalculadoraProvider>);
    expect(screen.getByTestId('personas').textContent).toBe('4');
  });

  test('calcula en vivo los apartados visitados y suma el total', async () => {
    render(<CalculadoraProvider><Sonda /></CalculadoraProvider>);
    act(() => screen.getByText('visitar').click());
    await act(async () => { await vi.advanceTimersByTimeAsync(500); });
    expect(api.calcularModulo).toHaveBeenCalledWith('vivienda', expect.objectContaining({ personas: 2 }), { pais: 'españa' });
    expect(screen.getByTestId('total').textContent).toBe('1234');
  });
});

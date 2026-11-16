import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { CalculadoraProvider } from '../CalculadoraContext.jsx';
import ResultadosPage from '../pages/ResultadosPage.jsx';

const resultado = {
  modulos: {
    vivienda: { modulo: 'vivienda', totalKg: 1000, incertidumbreKg: 100, partidas: [] },
    transporte: { modulo: 'transporte', totalKg: 4000, incertidumbreKg: 800, partidas: [] },
  },
  modulosCalculados: ['vivienda', 'transporte'],
  totalKg: 5000,
  incertidumbreKg: 806,
  compensacionFotovoltaicaKg: 0,
  netoOrientativoKg: 5000,
  factorElectrico: { origen: 'nacional', fuente: 'Ember (2024)' },
  comparacion: { pais: 'España', referenciaKg: 4750, anio: 2024, fuente: 'Worldometer' },
  planetas: { valor: 2, presupuestoKg: 2500 },
  gestos: [
    { id: 'compartir-coche', modulo: 'transporte', titulo: 'Comparte el coche', descripcion: '', ahorroKg: 1000 },
    { id: 'ahorrar-electricidad', modulo: 'vivienda', titulo: 'Ahorra electricidad', descripcion: '', ahorroKg: 100 },
  ],
};

vi.mock('../api.js', () => ({
  getFactores: vi.fn(() => Promise.resolve({})),
  calcularModulo: vi.fn(() => new Promise(() => {})),
  calcularHuella: vi.fn(() => Promise.resolve(resultado)),
}));

const renderizar = () => render(
  <MemoryRouter initialEntries={['/calculadora/resultados']}>
    <CalculadoraProvider><ResultadosPage /></CalculadoraProvider>
  </MemoryRouter>,
);

describe('ResultadosPage', () => {
  beforeEach(() => sessionStorage.clear());
  afterEach(cleanup);

  test('sin apartados rellenados invita a empezar', () => {
    renderizar();
    expect(screen.getByText('Aún no has rellenado ningún apartado.')).toBeTruthy();
  });

  test('muestra el total, los planetas, la comparación y lo que falta por rellenar', async () => {
    sessionStorage.setItem('calculadora-huella:v1', JSON.stringify({ visitados: ['vivienda', 'transporte'], formulario: {} }));
    renderizar();
    expect((await screen.findAllByText('5,0')).length).toBeGreaterThan(0);
    expect(screen.getByRole('img', { name: '2 planetas' })).toBeTruthy();
    expect(screen.getByText('Media de España*')).toBeTruthy();
    expect(screen.getByRole('link', { name: 'vuelos' })).toBeTruthy();
  });

  test('al marcar gestos recalcula la huella que quedaría', async () => {
    sessionStorage.setItem('calculadora-huella:v1', JSON.stringify({ visitados: ['vivienda', 'transporte'], formulario: {} }));
    renderizar();
    fireEvent.click(await screen.findByLabelText(/Comparte el coche/));
    expect(screen.getByText('4,0')).toBeTruthy();
    expect(screen.getByText(/un 20 % de tu huella/)).toBeTruthy();
  });
});

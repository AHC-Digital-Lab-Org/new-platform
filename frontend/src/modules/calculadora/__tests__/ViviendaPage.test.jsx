import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { CalculadoraProvider } from '../CalculadoraContext.jsx';
import ViviendaPage from '../pages/ViviendaPage.jsx';
import * as api from '../api.js';

vi.mock('../api.js', () => ({
  getFactores: vi.fn(() => Promise.resolve({
    vivienda: {
      fuentes: [
        { id: 'electricidad', etiqueta: 'Electricidad', unidades: ['kWh_anual'] },
        { id: 'gas', etiqueta: 'Gas natural', unidades: ['kWh_anual', 'm3_anual'] },
      ],
    },
  })),
  calcularModulo: vi.fn(() => Promise.resolve({
    modulo: 'vivienda',
    totalKg: 420,
    incertidumbreKg: 40,
    partidas: [{ id: 'electricidad', etiqueta: 'Electricidad', kg: 420, incertidumbreKg: 40 }],
  })),
}));

const renderizar = () => render(
  <MemoryRouter initialEntries={['/calculadora/vivienda']}>
    <CalculadoraProvider><ViviendaPage /></CalculadoraProvider>
  </MemoryRouter>,
);

describe('ViviendaPage', () => {
  beforeEach(() => sessionStorage.clear());
  afterEach(cleanup);

  test('envía el consumo con las personas elegidas y muestra el resultado del apartado', async () => {
    renderizar();
    fireEvent.click(screen.getByLabelText('3'));
    fireEvent.change(screen.getByLabelText('Consumo de electricidad al año'), { target: { value: '2.800' } });
    fireEvent.change(screen.getByLabelText('Consumo de electricidad al año'), { target: { value: '2800' } });

    await waitFor(() => expect(api.calcularModulo).toHaveBeenLastCalledWith(
      'vivienda',
      expect.objectContaining({ personas: 3, consumos: { electricidad: { valor: 2800, unidad: 'kWh_anual' } } }),
      { pais: 'españa' },
    ));
    expect(await screen.findByText('0,4')).toBeTruthy();
    expect(screen.getByText('420 kg')).toBeTruthy();
  });

  test('muestra el campo de una calefacción solo al marcarla', async () => {
    renderizar();
    expect(screen.queryByLabelText('Gas natural al año')).toBeNull();
    fireEvent.click(screen.getByLabelText('Gas natural'));
    expect(screen.getByLabelText('Gas natural al año')).toBeTruthy();
  });

  test('avisa de forma accesible si el valor no es un número', () => {
    renderizar();
    const campo = screen.getByLabelText('Consumo de electricidad al año');
    act(() => { fireEvent.change(campo, { target: { value: 'mucho' } }); });
    expect(campo.getAttribute('aria-invalid')).toBe('true');
    expect(screen.getByRole('alert').textContent).toMatch(/solo un número/);
  });
});

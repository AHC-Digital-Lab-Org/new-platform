import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router';
import { ApiError } from '@/shared/api/client.js';
import { logoutAll } from '../api.js';
import LogoutAllSection from './LogoutAllSection.jsx';

vi.mock('../api.js', () => ({ logoutAll: vi.fn() }));
const logout = vi.hoisted(() => vi.fn());
vi.mock('../AuthContext.jsx', () => ({
  useAuth: () => ({ logout }),
}));

const renderSection = () =>
  render(
    <MemoryRouter initialEntries={['/security']}>
      <Routes>
        <Route path="/security" element={<LogoutAllSection />} />
        <Route path="/login" element={<p>pantalla de login</p>} />
      </Routes>
    </MemoryRouter>,
  );

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('LogoutAllSection', () => {
  it('pide confirmación antes de llamar a la API', () => {
    renderSection();
    fireEvent.click(screen.getByRole('button', { name: 'Cerrar todas las sesiones' }));

    expect(logoutAll).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Sí, cerrar todas' })).toBeTruthy();
  });

  it('al confirmar: revoca, descarta el token local y va a /login', async () => {
    logoutAll.mockResolvedValue({ message: 'ok' });
    renderSection();
    fireEvent.click(screen.getByRole('button', { name: 'Cerrar todas las sesiones' }));
    fireEvent.click(screen.getByRole('button', { name: 'Sí, cerrar todas' }));

    expect(await screen.findByText('pantalla de login')).toBeTruthy();
    expect(logout).toHaveBeenCalledTimes(1);
  });

  it('si la API falla no descarta la sesión local', async () => {
    logoutAll.mockRejectedValue(
      new ApiError('sin red', { code: 'NETWORK_ERROR' }),
    );
    renderSection();
    fireEvent.click(screen.getByRole('button', { name: 'Cerrar todas las sesiones' }));
    fireEvent.click(screen.getByRole('button', { name: 'Sí, cerrar todas' }));

    expect(await screen.findByText('sin red')).toBeTruthy();
    expect(logout).not.toHaveBeenCalled();
  });
});

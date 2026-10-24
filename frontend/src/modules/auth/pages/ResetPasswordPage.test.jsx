import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import { MemoryRouter, useLocation } from 'react-router';
import { resetPassword } from '../api.js';
import ResetPasswordPage from './ResetPasswordPage.jsx';

vi.mock('../api.js', () => ({ resetPassword: vi.fn() }));
vi.mock('../AuthContext.jsx', () => ({
  useAuth: () => ({ isAuthenticated: false, logout: vi.fn() }),
}));

function SearchProbe() {
  return <p data-testid="search">{useLocation().search}</p>;
}

const renderPage = () =>
  render(
    <MemoryRouter initialEntries={['/reset-password?token=tok123']}>
      <ResetPasswordPage />
      <SearchProbe />
    </MemoryRouter>,
  );

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('ResetPasswordPage', () => {
  it('retira el token de la URL y lo envía al cambiar la contraseña', async () => {
    resetPassword.mockResolvedValue({ message: 'Contraseña actualizada' });
    renderPage();

    await waitFor(() => expect(screen.getByTestId('search').textContent).toBe(''));

    fireEvent.change(screen.getByLabelText(/^Nueva contraseña/), {
      target: { value: 'nuevaclave1' },
    });
    fireEvent.change(screen.getByLabelText(/^Repite la contraseña/), {
      target: { value: 'nuevaclave1' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Cambiar contraseña' }));

    expect(await screen.findByText('Contraseña actualizada')).toBeTruthy();
    expect(resetPassword).toHaveBeenCalledWith({
      token: 'tok123',
      password: 'nuevaclave1',
    });
  });

  it('no envía nada si las contraseñas no coinciden', async () => {
    renderPage();
    fireEvent.change(screen.getByLabelText(/^Nueva contraseña/), {
      target: { value: 'nuevaclave1' },
    });
    fireEvent.change(screen.getByLabelText(/^Repite la contraseña/), {
      target: { value: 'otraclave22' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Cambiar contraseña' }));

    expect(await screen.findByText('Las contraseñas no coinciden.')).toBeTruthy();
    expect(resetPassword).not.toHaveBeenCalled();
  });
});

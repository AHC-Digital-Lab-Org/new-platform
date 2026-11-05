import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router';
import { ApiError } from '@/shared/api/client.js';
import { loginTwoFactor } from '../api.js';
import LoginPage from './LoginPage.jsx';

const auth = vi.hoisted(() => ({
  authenticated: false,
  listeners: new Set(),
  login: vi.fn(),
  applySession: vi.fn(),
}));

vi.mock('../api.js', () => ({ loginTwoFactor: vi.fn() }));
vi.mock('../AuthContext.jsx', async () => {
  const { useSyncExternalStore } = await import('react');

  return {
    useAuth: () => {
      const authenticated = useSyncExternalStore(
        (listener) => {
          auth.listeners.add(listener);
          return () => auth.listeners.delete(listener);
        },
        () => auth.authenticated,
      );

      return {
        status: authenticated ? 'authenticated' : 'anonymous',
        isAuthenticated: authenticated,
        login: auth.login,
        applySession: auth.applySession,
      };
    },
  };
});

const renderLogin = () =>
  render(
    <MemoryRouter initialEntries={['/login']}>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/" element={<p>portada</p>} />
      </Routes>
    </MemoryRouter>,
  );

const goToSecondStep = async () => {
  auth.login.mockResolvedValue({
    twoFactorRequired: true,
    twoFactorToken: 't2fa',
  });
  renderLogin();
  fireEvent.change(screen.getByLabelText(/^Email/), {
    target: { value: 'ana@example.org' },
  });
  fireEvent.change(screen.getByLabelText(/^Contraseña/), {
    target: { value: 'secreto123' },
  });
  fireEvent.click(screen.getByRole('button', { name: 'Entrar' }));
  await screen.findByRole('heading', { name: 'Verificación en dos pasos' });
};

const sendCode = (code) => {
  fireEvent.change(screen.getByLabelText(/^Código/), {
    target: { value: code },
  });
  fireEvent.click(screen.getByRole('button', { name: 'Verificar' }));
};

beforeEach(() => {
  auth.authenticated = false;
  auth.listeners.clear();
  auth.login.mockReset();
  auth.applySession.mockReset();
  auth.applySession.mockImplementation((token, user) => {
    auth.authenticated = true;
    for (const listener of auth.listeners) listener();
  });
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('LoginPage con 2FA', () => {
  it('TOTP correcto (con espacio): normaliza el código, abre sesión y redirige', async () => {
    await goToSecondStep();
    loginTwoFactor.mockResolvedValue({
      token: 'T',
      user: { alias: 'ana' },
    });
    sendCode('123 456');

    expect(await screen.findByText('portada')).toBeTruthy();
    expect(loginTwoFactor).toHaveBeenCalledWith({
      twoFactorToken: 't2fa',
      code: '123456',
    });
    expect(auth.applySession).toHaveBeenCalledWith('T', { alias: 'ana' });
  });

  it('código de recuperación: muestra los restantes antes de continuar', async () => {
    await goToSecondStep();
    loginTwoFactor.mockResolvedValue({
      token: 'T',
      user: { alias: 'ana' },
      recoveryCodesRemaining: 2,
    });
    sendCode('abcd-efgh-jkmn');

    expect(
      await screen.findByText('Te quedan 2 códigos de recuperación sin usar.'),
    ).toBeTruthy();
    expect(screen.queryByText('portada')).toBeNull();

    fireEvent.click(screen.getByRole('link', { name: 'Continuar' }));
    expect(await screen.findByText('portada')).toBeTruthy();
  });

  it('código incorrecto: muestra el error y permite reintentar', async () => {
    await goToSecondStep();
    loginTwoFactor.mockRejectedValue(
      new ApiError('Código incorrecto', {
        status: 401,
        code: 'INVALID_TWO_FACTOR_CODE',
      }),
    );
    sendCode('000000');

    expect(await screen.findByText(/Código incorrecto\./)).toBeTruthy();
    expect(
      screen.getByRole('heading', { name: 'Verificación en dos pasos' }),
    ).toBeTruthy();
    expect(screen.getByLabelText(/^Código/).value).toBe('');
    expect(auth.applySession).not.toHaveBeenCalled();
  });

  it('twoFactorToken caducado: vuelve al paso 1 con aviso', async () => {
    await goToSecondStep();
    loginTwoFactor.mockRejectedValue(
      new ApiError('caducado', {
        status: 401,
        code: 'INVALID_TWO_FACTOR_TOKEN',
      }),
    );
    sendCode('123456');

    expect(await screen.findByRole('heading', { name: 'Iniciar sesión' })).toBeTruthy();
    expect(
      screen.getByText(
        'La verificación en dos pasos ha caducado. Inicia sesión de nuevo.',
      ),
    ).toBeTruthy();
    expect(screen.getByLabelText(/^Email/).value).toBe('ana@example.org');
    expect(screen.getByLabelText(/^Contraseña/).value).toBe('');
  });
});

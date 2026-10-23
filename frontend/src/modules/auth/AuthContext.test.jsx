import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import { MemoryRouter, useLocation } from 'react-router';
import {
  api,
  setAuthToken,
  setSessionInvalidHandler,
} from '@/shared/api/client.js';
import { AuthProvider, useAuth } from './AuthContext.jsx';
import { getToken, saveToken } from './tokenStorage.js';

const jsonResponse = (status, body) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });

let fetchMock;

const mockRoutes = (routes) =>
  fetchMock.mockImplementation(async (url) => {
    const key = Object.keys(routes).find((route) => url.endsWith(route));
    if (!key) throw new Error(`Petición inesperada: ${url}`);
    return routes[key]();
  });

function Probe() {
  const { status, user, login } = useAuth();
  const { pathname } = useLocation();

  return (
    <div>
      <p data-testid="status">{status}</p>
      <p data-testid="alias">{user?.alias ?? '-'}</p>
      <p data-testid="path">{pathname}</p>
      <button onClick={() => login('ana@example.org', 'secreto123').catch(() => {})}>
        entrar
      </button>
      <button onClick={() => api('/auth/me').catch(() => {})}>ping</button>
    </div>
  );
}

const renderApp = () =>
  render(
    <MemoryRouter initialEntries={['/ecogestos']}>
      <AuthProvider>
        <Probe />
      </AuthProvider>
    </MemoryRouter>,
  );

const expectStatus = (status) =>
  waitFor(() => expect(screen.getByTestId('status').textContent).toBe(status));

beforeEach(() => {
  window.sessionStorage.clear();
  setAuthToken(null);
  fetchMock = vi.fn();
  vi.stubGlobal('fetch', fetchMock);
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  setSessionInvalidHandler(null);
});

describe('AuthProvider', () => {
  it('sin token queda anónimo y no llama a la API', async () => {
    renderApp();
    await expectStatus('anonymous');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('con token guardado carga /me y envía Authorization', async () => {
    saveToken('tok');
    mockRoutes({ '/auth/me': async () => jsonResponse(200, { user: { alias: 'ana' } }) });
    renderApp();
    await expectStatus('authenticated');
    expect(screen.getByTestId('alias').textContent).toBe('ana');
    expect(fetchMock.mock.calls[0][1].headers.authorization).toBe('Bearer tok');
  });

  it('token caducado al arrancar: limpia la sesión y NO redirige', async () => {
    saveToken('viejo');
    mockRoutes({
      '/auth/me': async () =>
        jsonResponse(401, { error: { code: 'TOKEN_EXPIRED', message: 'Caducado' } }),
    });
    renderApp();
    await expectStatus('anonymous');
    expect(getToken()).toBeNull();
    expect(screen.getByTestId('path').textContent).toBe('/ecogestos');
  });

  it('fallo de red al arrancar: estado error y conserva el token', async () => {
    saveToken('tok');
    fetchMock.mockRejectedValue(new TypeError('Failed to fetch'));
    renderApp();
    await expectStatus('error');
    expect(getToken()).toBe('tok');
  });

  it('login correcto guarda token y usuario', async () => {
    mockRoutes({
      '/auth/login': async () =>
        jsonResponse(200, { token: 'nuevo', user: { alias: 'ana' } }),
    });
    renderApp();
    await expectStatus('anonymous');
    await act(async () => {
      fireEvent.click(screen.getByText('entrar'));
    });
    await expectStatus('authenticated');
    expect(getToken()).toBe('nuevo');
    expect(screen.getByTestId('alias').textContent).toBe('ana');
  });

  it('login con 2FA no abre sesión ni guarda token', async () => {
    mockRoutes({
      '/auth/login': async () =>
        jsonResponse(200, { twoFactorRequired: true, twoFactorToken: 't2fa' }),
    });
    renderApp();
    await expectStatus('anonymous');
    await act(async () => {
      fireEvent.click(screen.getByText('entrar'));
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId('status').textContent).toBe('anonymous');
    expect(getToken()).toBeNull();
  });

  it('si la sesión se revoca estando autenticado: limpia y redirige a /login', async () => {
    saveToken('tok');
    mockRoutes({
      '/auth/me': async () => jsonResponse(200, { user: { alias: 'ana' } }),
    });
    renderApp();
    await expectStatus('authenticated');

    mockRoutes({
      '/auth/me': async () =>
        jsonResponse(401, { error: { code: 'SESSION_REVOKED', message: 'Revocada' } }),
    });
    await act(async () => {
      fireEvent.click(screen.getByText('ping'));
    });
    await expectStatus('anonymous');
    expect(screen.getByTestId('path').textContent).toBe('/login');
    expect(getToken()).toBeNull();
  });
});

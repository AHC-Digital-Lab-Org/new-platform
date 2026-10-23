// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { api, setAuthToken, setSessionInvalidHandler } from './client.js';

const jsonResponse = (status, body, headers = {}) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json', ...headers },
  });

let fetchMock;

beforeEach(() => {
  fetchMock = vi.fn();
  vi.stubGlobal('fetch', fetchMock);
  setAuthToken(null);
  setSessionInvalidHandler(null);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('api()', () => {
  it('devuelve el JSON si todo va bien', async () => {
    fetchMock.mockResolvedValue(jsonResponse(200, { ok: true }));
    await expect(api('/health')).resolves.toEqual({ ok: true });
  });

  it('añade Authorization solo si hay token', async () => {
    fetchMock.mockImplementation(async () => jsonResponse(200, {}));
    await api('/a');
    expect(fetchMock.mock.calls[0][1].headers.authorization).toBeUndefined();

    setAuthToken('abc');
    await api('/b');
    expect(fetchMock.mock.calls[1][1].headers.authorization).toBe('Bearer abc');
  });

  it('lanza ApiError con code, status y details', async () => {
    const details = [{ path: 'body.email', message: 'Email no válido' }];
    fetchMock.mockResolvedValue(
      jsonResponse(400, {
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Datos de entrada no válidos',
          details,
        },
      }),
    );
    await expect(api('/auth/login', { method: 'POST', body: {} })).rejects.toMatchObject({
      name: 'ApiError',
      status: 400,
      code: 'VALIDATION_ERROR',
      message: 'Datos de entrada no válidos',
      details,
    });
  });

  it('lee Retry-After en un 429', async () => {
    fetchMock.mockResolvedValue(
      jsonResponse(
        429,
        { error: { code: 'TOO_MANY_REQUESTS', message: 'Demasiados intentos' } },
        { 'retry-after': '42' },
      ),
    );
    await expect(api('/auth/login', { method: 'POST', body: {} })).rejects.toMatchObject({
      code: 'TOO_MANY_REQUESTS',
      retryAfter: 42,
    });
  });

  it('retryAfter es null si la cabecera falta', async () => {
    fetchMock.mockResolvedValue(
      jsonResponse(429, { error: { code: 'TOO_MANY_REQUESTS', message: 'x' } }),
    );
    await expect(api('/x')).rejects.toMatchObject({ retryAfter: null });
  });

  it('convierte los fallos de red en NETWORK_ERROR', async () => {
    fetchMock.mockRejectedValue(new TypeError('Failed to fetch'));
    await expect(api('/x')).rejects.toMatchObject({
      code: 'NETWORK_ERROR',
      status: 0,
    });
  });

  it('avisa al handler si la sesión es inválida y la petición llevaba token', async () => {
    const handler = vi.fn();
    setSessionInvalidHandler(handler);
    setAuthToken('abc');
    fetchMock.mockResolvedValue(
      jsonResponse(401, {
        error: { code: 'TOKEN_EXPIRED', message: 'Sesión caducada' },
      }),
    );

    await expect(api('/auth/me')).rejects.toMatchObject({ code: 'TOKEN_EXPIRED' });
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('no avisa al handler si no había token (p. ej. credenciales incorrectas)', async () => {
    const handler = vi.fn();
    setSessionInvalidHandler(handler);
    fetchMock.mockResolvedValue(
      jsonResponse(401, { error: { code: 'INVALID_CREDENTIALS', message: 'x' } }),
    );

    await expect(api('/auth/login', { method: 'POST', body: {} })).rejects.toThrow();
    expect(handler).not.toHaveBeenCalled();
  });

  it('no avisa si el token cambió mientras la petición estaba en vuelo', async () => {
    const handler = vi.fn();
    setSessionInvalidHandler(handler);
    setAuthToken('viejo');
    fetchMock.mockImplementation(async () => {
      setAuthToken('nuevo');
      return jsonResponse(401, { error: { code: 'SESSION_REVOKED', message: 'x' } });
    });

    await expect(api('/auth/me')).rejects.toThrow();
    expect(handler).not.toHaveBeenCalled();
  });
});

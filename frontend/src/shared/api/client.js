const API_URL = import.meta.env.VITE_API_URL ?? '';

export const SESSION_ERROR_CODES = new Set([
  'TOKEN_EXPIRED',
  'SESSION_REVOKED',
  'INVALID_TOKEN',
  'UNAUTHORIZED',
]);

export class ApiError extends Error {
  constructor(
    message,
    { status = 0, code = 'UNKNOWN_ERROR', details, retryAfter = null } = {},
  ) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.details = details;
    this.retryAfter = retryAfter;
  }
}

let authToken = null;
let onSessionInvalid = null;

export const setAuthToken = (token) => {
  authToken = token ?? null;
};

export const setSessionInvalidHandler = (handler) => {
  onSessionInvalid = handler ?? null;
};

const parseRetryAfter = (value) =>
  value && /^\d+$/.test(value.trim()) ? Number(value) : null;

export async function api(path, { body, headers, ...options } = {}) {
  const token = authToken;
  let res;

  try {
    res = await fetch(`${API_URL}/api${path}`, {
      ...options,
      headers: {
        'content-type': 'application/json',
        ...(token ? { authorization: `Bearer ${token}` } : {}),
        ...headers,
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    throw new ApiError(
      'No se pudo conectar con el servidor. Revisa tu conexión e inténtalo de nuevo.',
      { code: 'NETWORK_ERROR' },
    );
  }

  const data = res.status === 204 ? null : await res.json().catch(() => null);
  if (res.ok) return data;

  const error = new ApiError(data?.error?.message ?? `Error ${res.status}`, {
    status: res.status,
    code: data?.error?.code ?? 'UNKNOWN_ERROR',
    details: data?.error?.details,
    retryAfter: parseRetryAfter(res.headers.get('retry-after')),
  });

  if (token && token === authToken && SESSION_ERROR_CODES.has(error.code)) {
    onSessionInvalid?.(error);
  }

  throw error;
}

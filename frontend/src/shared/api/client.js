// Cliente HTTP común para todos los módulos. Lanza un Error con el mensaje del backend.
const API_URL = import.meta.env.VITE_API_URL ?? '';

export async function api(path, { body, ...options } = {}) {
  const res = await fetch(`${API_URL}/api${path}`, {
    ...options,
    headers: { 'content-type': 'application/json', ...options.headers },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const data = res.status === 204 ? null : await res.json().catch(() => null);
  if (!res.ok) {
    const error = new Error(data?.error?.message ?? `Error ${res.status}`);
    error.status = res.status;
    error.details = data?.error?.details;
    throw error;
  }
  return data;
}

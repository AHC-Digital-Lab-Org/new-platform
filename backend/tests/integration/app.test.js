import { afterAll, beforeAll, expect, test } from 'vitest';
import { createApp } from '../../src/app.js';

// Tests que no necesitan base de datos. Los que sí la necesiten deben usar una BD de test.
let server;
let base;

beforeAll(async () => {
  server = createApp().listen(0);
  await new Promise((resolve) => server.once('listening', resolve));
  base = `http://localhost:${server.address().port}/api`;
});

afterAll(() => server.close());

test('GET /api/health responde ok', async () => {
  const res = await fetch(`${base}/health`);
  expect(res.status).toBe(200);
  expect(await res.json()).toEqual({ status: 'ok' });
  expect(res.headers.get('x-powered-by')).toBeNull();
  expect(res.headers.get('x-content-type-options')).toBe('nosniff');
});

test('body-parser conserva la respuesta 413 para JSON demasiado grande', async () => {
  const res = await fetch(`${base}/nonexistent`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ value: 'x'.repeat(1024 * 1024) }),
  });

  expect(res.status).toBe(413);
  expect((await res.json()).error).toMatchObject({ code: 'BAD_REQUEST' });
});

test('la especificación OpenAPI incluye las rutas de los módulos', async () => {
  const spec = await (await fetch(`${base}/docs.json`)).json();
  expect(spec.paths).toHaveProperty(['/ecogestos/products']);
  expect(spec.paths).toHaveProperty(['/chatbot/ask']);
});

test('la validación devuelve 400 con detalles', async () => {
  const res = await fetch(`${base}/chatbot/ask`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ question: '' }),
  });
  expect(res.status).toBe(400);
  const body = await res.json();
  expect(body.error.code).toBe('VALIDATION_ERROR');
  expect(body.error.details[0].path).toBe('body.question');
});

test('rutas desconocidas devuelven 404 JSON', async () => {
  const res = await fetch(`${base}/no-existe`);
  expect(res.status).toBe(404);
});

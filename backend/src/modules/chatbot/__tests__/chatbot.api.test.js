import express from 'express';
import request from 'supertest';
import {
  afterAll,
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest';

vi.mock('../chatbot.provider.js', () => ({ generate: vi.fn() }));

import { env } from '#infrastructure/config/env.js';
import { errorHandler } from '#middleware/error.middleware.js';
import { generate } from '../chatbot.provider.js';
import chatbot from '../index.js';

const URL = '/api/chatbot/ask';
const originalKey = env.gemini.apiKey;

const createTestApp = () => {
  const app = express();
  app.use(express.json());
  app.use('/api/chatbot', chatbot.router);
  app.use(errorHandler);
  return app;
};

describe('POST /api/chatbot/ask', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    env.gemini.apiKey = 'test-key';
    generate.mockResolvedValue('Respuesta del modelo');
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
  });

  afterAll(() => {
    env.gemini.apiKey = originalKey;
  });

  it('responde 200 con la respuesta del asistente', async () => {
    const res = await request(createTestApp())
      .post(URL)
      .send({ question: '¿Qué es un EcoGesto?' });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ answer: 'Respuesta del modelo', sources: [] });
  });

  it('pasa el historial y el idioma al servicio', async () => {
    await request(createTestApp())
      .post(URL)
      .send({
        question: 'Gràcies',
        history: [{ role: 'user', text: 'Hola' }],
        locale: 'ca',
      });

    const call = generate.mock.calls[0][0];
    expect(call.contents).toHaveLength(2);
    expect(call.systemInstruction).toContain('catalán');
  });

  it('responde 400 ante datos no válidos y no llama al proveedor', async () => {
    const res = await request(createTestApp())
      .post(URL)
      .send({ question: 'hola', history: [{ role: 'system', text: 'x' }] });

    expect(res.status).toBe(400);
    expect(generate).not.toHaveBeenCalled();
  });

  it('responde 503 CHATBOT_UNAVAILABLE si falta la clave', async () => {
    env.gemini.apiKey = undefined;

    const res = await request(createTestApp())
      .post(URL)
      .send({ question: 'hola' });

    expect(res.status).toBe(503);
    expect(res.body.error.code).toBe('CHATBOT_UNAVAILABLE');
  });

  it('responde 429 CHATBOT_BUSY cuando Gemini está saturado', async () => {
    generate.mockRejectedValue(Object.assign(new Error('cuota'), { status: 429 }));

    const res = await request(createTestApp())
      .post(URL)
      .send({ question: 'hola' });

    expect(res.status).toBe(429);
    expect(res.body.error.code).toBe('CHATBOT_BUSY');
  });

  it('responde 502 CHATBOT_BAD_RESPONSE ante una respuesta vacía', async () => {
    generate.mockResolvedValue('');

    const res = await request(createTestApp())
      .post(URL)
      .send({ question: 'hola' });

    expect(res.status).toBe(502);
    expect(res.body.error.code).toBe('CHATBOT_BAD_RESPONSE');
  });

  it('limita las consultas por IP con 429 TOO_MANY_REQUESTS', async () => {
    vi.stubEnv('RATE_LIMIT_IN_TEST', 'true');
    const app = createTestApp();

    let limited;
    for (let i = 0; i < 100 && !limited; i += 1) {
      const res = await request(app).post(URL).send({ question: 'hola' });
      if (res.status === 429) limited = res;
    }

    expect(limited).toBeDefined();
    expect(limited.body.error.code).toBe('TOO_MANY_REQUESTS');
  });
});
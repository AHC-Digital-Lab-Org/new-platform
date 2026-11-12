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
import { generate } from '../chatbot.provider.js';
import { ask } from '../chatbot.service.js';

const originalKey = env.gemini.apiKey;

const providerError = (status) =>
  Object.assign(new Error('detalle interno del proveedor'), { status });

describe('ask', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    env.gemini.apiKey = 'test-key';
    generate.mockResolvedValue('Respuesta del modelo');
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  afterAll(() => {
    env.gemini.apiKey = originalKey;
  });

  describe('respuesta', () => {
    it('devuelve la respuesta del modelo sin fuentes', async () => {
      await expect(ask('¿Qué es un EcoGesto?')).resolves.toEqual({
        answer: 'Respuesta del modelo',
        sources: [],
      });
    });

    it('envía el historial y la pregunta, traduciendo assistant a model', async () => {
      await ask('¿Y los roles?', {
        history: [
          { role: 'user', text: 'Hola' },
          { role: 'assistant', text: 'Hola, ¿en qué te ayudo?' },
        ],
      });

      expect(generate.mock.calls[0][0].contents).toEqual([
        { role: 'user', parts: [{ text: 'Hola' }] },
        { role: 'model', parts: [{ text: 'Hola, ¿en qué te ayudo?' }] },
        { role: 'user', parts: [{ text: '¿Y los roles?' }] },
      ]);
    });

    it('usa el system prompt de la AHC', async () => {
      await ask('hola');

      expect(generate.mock.calls[0][0].systemInstruction).toContain(
        'Asociación Huella de Carbono',
      );
    });

    it('indica el idioma de la interfaz cuando recibe locale', async () => {
      await ask('hola', { locale: 'ca' });

      expect(generate.mock.calls[0][0].systemInstruction).toContain(
        'Idioma de la interfaz del voluntario: catalán.',
      );
    });

    it('no indica idioma de interfaz si no recibe locale', async () => {
      await ask('hola');

      expect(generate.mock.calls[0][0].systemInstruction).not.toContain(
        'Idioma de la interfaz del voluntario',
      );
    });
  });

  describe('errores', () => {
    it('responde CHATBOT_UNAVAILABLE sin clave y no llama al proveedor', async () => {
      env.gemini.apiKey = undefined;

      await expect(ask('hola')).rejects.toMatchObject({
        code: 'CHATBOT_UNAVAILABLE',
      });
      expect(generate).not.toHaveBeenCalled();
    });

    it('traduce el 429 del proveedor a CHATBOT_BUSY', async () => {
      generate.mockRejectedValue(providerError(429));

      await expect(ask('hola')).rejects.toMatchObject({ code: 'CHATBOT_BUSY' });
    });

    it.each([400, 401, 403, 404, 500, 503])(
      'traduce el %i del proveedor a CHATBOT_UNAVAILABLE sin filtrar detalles',
      async (status) => {
        generate.mockRejectedValue(providerError(status));

        const error = await ask('hola').catch((e) => e);

        expect(error.code).toBe('CHATBOT_UNAVAILABLE');
        expect(error.message).not.toContain('detalle interno');
        expect(console.error).toHaveBeenCalled();
      },
    );

    it('trata un fallo de red sin código HTTP como CHATBOT_UNAVAILABLE', async () => {
      generate.mockRejectedValue(new Error('fetch failed'));

      await expect(ask('hola')).rejects.toMatchObject({
        code: 'CHATBOT_UNAVAILABLE',
      });
    });

    it('responde CHATBOT_BAD_RESPONSE ante una respuesta vacía', async () => {
      generate.mockResolvedValue('');

      await expect(ask('hola')).rejects.toMatchObject({
        code: 'CHATBOT_BAD_RESPONSE',
      });
    });
  });
});
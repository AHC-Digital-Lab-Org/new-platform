import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../chatbot.provider.js', () => ({ generate: vi.fn() }));

import { generate } from '../chatbot.provider.js';
import { ask } from '../chatbot.service.js';

describe('ask', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    generate.mockResolvedValue('Respuesta del modelo');
  });

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
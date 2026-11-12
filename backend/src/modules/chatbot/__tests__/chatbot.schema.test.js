import { describe, expect, it } from 'vitest';
import {
  askBody,
  MAX_HISTORY_TURNS,
  MAX_TEXT_CHARS,
} from '../chatbot.schema.js';

const turns = (count) =>
  Array.from({ length: count }, (_, i) => ({
    role: i % 2 === 0 ? 'user' : 'assistant',
    text: `mensaje ${i}`,
  }));

describe('askBody', () => {
  it('acepta solo la pregunta y deja el historial vacío', () => {
    const result = askBody.safeParse({ question: '¿Qué es un EcoGesto?' });

    expect(result.success).toBe(true);
    expect(result.data.history).toEqual([]);
    expect(result.data.locale).toBeUndefined();
  });


  it('recorta los espacios de la pregunta', () => {
    const result = askBody.safeParse({ question: '  hola  ' });

    expect(result.data.question).toBe('hola');
  });

  it.each(['', '   ', '\n\t'])('rechaza la pregunta vacía %j', (question) => {
    expect(askBody.safeParse({ question }).success).toBe(false);
  });

  it('rechaza una pregunta sin el campo', () => {
    expect(askBody.safeParse({}).success).toBe(false);
  });

  it('acepta el máximo de caracteres y rechaza uno más', () => {
    const ok = askBody.safeParse({ question: 'a'.repeat(MAX_TEXT_CHARS) });
    const tooLong = askBody.safeParse({
      question: 'a'.repeat(MAX_TEXT_CHARS + 1),
    });

    expect(ok.success).toBe(true);
    expect(tooLong.success).toBe(false);
  });

  it('acepta un historial válido y un idioma permitido', () => {
    const result = askBody.safeParse({
      question: 'Gràcies',
      history: turns(2),
      locale: 'ca',
    });

    expect(result.success).toBe(true);
    expect(result.data.history).toHaveLength(2);
    expect(result.data.locale).toBe('ca');
  });

  it.each(['system', 'model', 'bot', ''])(
    'rechaza el rol %j en el historial',
    (role) => {
      const result = askBody.safeParse({
        question: 'hola',
        history: [{ role, text: 'x' }],
      });

      expect(result.success).toBe(false);
    },
  );

  it('acepta el máximo de turnos y rechaza uno más', () => {
    const ok = askBody.safeParse({
      question: 'hola',
      history: turns(MAX_HISTORY_TURNS),
    });
    const tooMany = askBody.safeParse({
      question: 'hola',
      history: turns(MAX_HISTORY_TURNS + 1),
    });

    expect(ok.success).toBe(true);
    expect(tooMany.success).toBe(false);
  });

  it('rechaza turnos vacíos o demasiado largos', () => {
    const empty = askBody.safeParse({
      question: 'hola',
      history: [{ role: 'user', text: '  ' }],
    });
    const tooLong = askBody.safeParse({
      question: 'hola',
      history: [{ role: 'user', text: 'a'.repeat(MAX_TEXT_CHARS + 1) }],
    });

    expect(empty.success).toBe(false);
    expect(tooLong.success).toBe(false);
  });

  it('rechaza un idioma no soportado', () => {
    expect(askBody.safeParse({ question: 'hola', locale: 'fr' }).success).toBe(
      false,
    );
  });

  it('rechaza propiedades adicionales en el cuerpo y en los turnos', () => {
    const body = askBody.safeParse({ question: 'hola', admin: true });
    const turn = askBody.safeParse({
      question: 'hola',
      history: [{ role: 'user', text: 'x', extra: 1 }],
    });

    expect(body.success).toBe(false);
    expect(turn.success).toBe(false);
  });
});
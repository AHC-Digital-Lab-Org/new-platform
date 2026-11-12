import { readFileSync } from 'node:fs';
import { env } from '#infrastructure/config/env.js';
import { logger } from '#infrastructure/logger/logger.js';
import { AppError } from '#shared/errors/index.js';
import { generate } from './chatbot.provider.js';

const SYSTEM_PROMPT = readFileSync(
  new URL('./system-prompt.md', import.meta.url),
  'utf8',
);

const LOCALE_NAMES = { es: 'español', ca: 'catalán', en: 'inglés' };
const MODEL_ROLES = { user: 'user', assistant: 'model' };

const buildSystemInstruction = (locale) =>
  locale
    ? `${SYSTEM_PROMPT}\n\n---\nIdioma de la interfaz del voluntario: ${LOCALE_NAMES[locale]}.`
    : SYSTEM_PROMPT;

const buildContents = (question, history) => [
  ...history.map(({ role, text }) => ({
    role: MODEL_ROLES[role],
    parts: [{ text }],
  })),
  { role: 'user', parts: [{ text: question }] },
];

const unavailable = () =>
  new AppError(
    503,
    'CHATBOT_UNAVAILABLE',
    'El asistente no está disponible en este momento. Inténtalo más tarde',
  );

const toProviderError = (error) => {
  const status = error?.status ?? error?.code;
  if (status === 429) {
    logger.warn('[chatbot] Gemini devolvió 429 (límite o cuota)');
    return new AppError(
      429,
      'CHATBOT_BUSY',
      'Hay muchas consultas en este momento. Inténtalo de nuevo en unos instantes',
    );
  }

  logger.error('[chatbot] Fallo del proveedor de IA', {
    status,
    message: error?.message,
  });
  return unavailable();
};

export const ask = async (question, { history = [], locale } = {}) => {
  if (!env.gemini.apiKey) {
    logger.error('[chatbot] Falta GEMINI_API_KEY');
    throw unavailable();
  }

  let answer;
  try {
    answer = await generate({
      systemInstruction: buildSystemInstruction(locale),
      contents: buildContents(question, history),
    });
  } catch (error) {
    throw toProviderError(error);
  }

  if (!answer) {
    logger.warn('[chatbot] Gemini devolvió una respuesta vacía');
    throw new AppError(
      502,
      'CHATBOT_BAD_RESPONSE',
      'No se ha recibido una respuesta válida. Inténtalo de nuevo',
    );
  }

  return { answer, sources: [] };
};

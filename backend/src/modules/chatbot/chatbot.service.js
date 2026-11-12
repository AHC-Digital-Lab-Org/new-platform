import { readFileSync } from 'node:fs';
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

export const ask = async (question, { history = [], locale } = {}) => {
  const answer = await generate({
    systemInstruction: buildSystemInstruction(locale),
    contents: buildContents(question, history),
  });
  return { answer, sources: [] };
};

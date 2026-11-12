import { z } from 'zod';

export const MAX_TEXT_CHARS = 2000;
export const MAX_HISTORY_TURNS = 10;
export const LOCALES = ['es', 'ca', 'en'];

const text = z.string().trim().min(1).max(MAX_TEXT_CHARS);

const turn = z
  .object({
    role: z.enum(['user', 'assistant']),
    text,
  })
  .strict();

export const askBody = z
  .object({
    question: text,
    history: z.array(turn).max(MAX_HISTORY_TURNS).default([]),
    locale: z.enum(LOCALES).optional(),
  })
  .strict();

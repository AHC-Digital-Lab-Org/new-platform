import { GoogleGenAI } from '@google/genai';
import { env } from '#infrastructure/config/env.js';

const TEMPERATURE = 0.2;
const MAX_OUTPUT_TOKENS = 1024;

let client;
const getClient = () =>
  (client ??= new GoogleGenAI({ apiKey: env.gemini.apiKey }));

export const generate = async ({ systemInstruction, contents }) => {
  const response = await getClient().models.generateContent({
    model: env.gemini.model,
    contents,
    config: {
      systemInstruction,
      temperature: TEMPERATURE,
      maxOutputTokens: MAX_OUTPUT_TOKENS,
    },
  });
  return (response.text ?? '').trim();
};
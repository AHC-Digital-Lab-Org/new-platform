import { api } from '@/shared/api/client.js';

export const ask = (question) => api('/chatbot/ask', { method: 'POST', body: { question } });

import { api } from '@/shared/api/client.js';

export const me = () => api('/auth/me');

export const login = (credentials) =>
  api('/auth/login', { method: 'POST', body: credentials });

export const register = (data) =>
  api('/auth/register', { method: 'POST', body: data });

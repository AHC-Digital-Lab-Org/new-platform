import { api } from '@/shared/api/client.js';

export const me = () => api('/auth/me');

export const login = (credentials) =>
  api('/auth/login', { method: 'POST', body: credentials });

export const register = (data) =>
  api('/auth/register', { method: 'POST', body: data });

export const verifyEmail = (token) =>
  api('/auth/verify-email', { method: 'POST', body: { token } });

export const resendVerification = (email) =>
  api('/auth/resend-verification', { method: 'POST', body: { email } });

export const forgotPassword = (email) =>
  api('/auth/forgot-password', { method: 'POST', body: { email } });

export const resetPassword = ({ token, password }) =>
  api('/auth/reset-password', { method: 'POST', body: { token, password } });

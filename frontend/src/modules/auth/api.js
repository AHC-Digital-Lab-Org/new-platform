import { api } from '@/shared/api/client.js';

export const me = () => api('/auth/me');

export const login = (credentials) =>
  api('/auth/login', { method: 'POST', body: credentials });

export const loginTwoFactor = ({ twoFactorToken, code }) =>
  api('/auth/2fa/login', {
    method: 'POST',
    body: { twoFactorToken, code },
  });

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

export const changePassword = ({ currentPassword, newPassword }) =>
  api('/auth/change-password', {
    method: 'POST',
    body: { currentPassword, newPassword },
  });

export const logoutAll = () =>
  api('/auth/logout-all', { method: 'POST' });

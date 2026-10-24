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

export const listRegistrationCountries = () =>
  api('/auth/locations/countries');

export const searchRegistrationCities = ({ country, query }) => {
  const params = new URLSearchParams({ country, q: query });
  return api(`/auth/locations/cities?${params.toString()}`);
};

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

export const twoFactorSetup = () =>
  api('/auth/2fa/setup', { method: 'POST' });

export const twoFactorEnable = (code) =>
  api('/auth/2fa/enable', { method: 'POST', body: { code } });

export const twoFactorDisable = ({ password, code }) =>
  api('/auth/2fa/disable', {
    method: 'POST',
    body: { password, code },
  });

export const regenerateRecoveryCodes = ({ password, code }) =>
  api('/auth/2fa/recovery-codes', {
    method: 'POST',
    body: { password, code },
  });

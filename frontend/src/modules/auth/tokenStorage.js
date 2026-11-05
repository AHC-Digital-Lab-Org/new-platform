const KEY = 'auth_token';

export const getToken = () => {
  try {
    return window.sessionStorage.getItem(KEY);
  } catch {
    return null;
  }
};

export const saveToken = (token) => {
  try {
    window.sessionStorage.setItem(KEY, token);
  } catch {
    // The active session remains available in memory.
  }
};

export const clearToken = () => {
  try {
    window.sessionStorage.removeItem(KEY);
  } catch {
    // Storage is unavailable; the in-memory session is still cleared by AuthProvider.
  }
};

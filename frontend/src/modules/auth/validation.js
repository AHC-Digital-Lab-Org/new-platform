export const EMAIL_RE = /^\S+@\S+\.\S+$/;
export const MIN_PASSWORD = 8;
export const MAX_PASSWORD_BYTES = 72;
export const passwordByteLength = (password) =>
  new TextEncoder().encode(password).length;

export const normalizeSecondFactor = (raw) => {
  const code = raw.trim();
  return /^\d{3}\s\d{3}$/.test(code) ? code.replace(/\s/, '') : code;
};

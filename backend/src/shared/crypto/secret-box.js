import crypto from 'node:crypto';
import { env } from '#infrastructure/config/env.js';

const VERSION = 'v1';
const ALGORITHM = 'aes-256-gcm';

const getKey = () => {
  const hex = env.totpEncryptionKey;

  if (!hex || !/^[0-9a-fA-F]{64}$/.test(hex)) {
    throw new Error(
      'TOTP_ENCRYPTION_KEY debe ser una cadena hexadecimal de 64 caracteres (32 bytes)',
    );
  }

  return Buffer.from(hex, 'hex');
};

export const isEncrypted = (value) =>
  typeof value === 'string' && value.startsWith(`${VERSION}:`);

export const encryptSecret = (plain) => {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGORITHM, getKey(), iv);
  const data = Buffer.concat([
    cipher.update(plain, 'utf8'),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();

  return [VERSION, iv, tag, data]
    .map((part) =>
      typeof part === 'string' ? part : part.toString('base64url'),
    )
    .join(':');
};

export const decryptSecret = (stored) => {
  if (!isEncrypted(stored)) return stored;

  const [, iv, tag, data] = stored.split(':');
  const decipher = crypto.createDecipheriv(
    ALGORITHM,
    getKey(),
    Buffer.from(iv, 'base64url'),
  );
  decipher.setAuthTag(Buffer.from(tag, 'base64url'));

  return Buffer.concat([
    decipher.update(Buffer.from(data, 'base64url')),
    decipher.final(),
  ]).toString('utf8');
};

// Única puerta de entrada a process.env. Las variables se cargan con `node --env-file`.
const required = (name) => {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`Falta la variable de entorno ${name}`);
  return value;
};

const nodeEnv = process.env.NODE_ENV ?? 'production';
const isDevLike = ['development', 'test'].includes(nodeEnv);

const setting = (name, devDefault) => {
  const value = process.env[name]?.trim();
  return value || (isDevLike ? devDefault : required(name));
};

const jwtSecret = setting(
  'JWT_SECRET',
  'dev-secret-no-usar-en-prod-development-only',
);
if (
  jwtSecret.length < 32 ||
  (!isDevLike &&
    [
      'cambia-esto-por-un-secreto-largo',
      'dev-secret-no-usar-en-prod',
      'replace-this-example-with-a-random-secret-before-deploy',
    ].includes(jwtSecret))
) {
  throw new Error('JWT_SECRET debe tener al menos 32 caracteres y no ser un placeholder');
}

const totpEncryptionKey = setting(
  'TOTP_ENCRYPTION_KEY',
  '0000000000000000000000000000000000000000000000000000000000000000',
);
if (!/^[0-9a-fA-F]{64}$/.test(totpEncryptionKey)) {
  throw new Error(
    'TOTP_ENCRYPTION_KEY debe ser una cadena hexadecimal de 64 caracteres (32 bytes)',
  );
}
if (!isDevLike && /^0{64}$/i.test(totpEncryptionKey)) {
  throw new Error('TOTP_ENCRYPTION_KEY no puede ser el valor de desarrollo');
}

const normalizeBaseUrl = (value) => value.replace(/\/+$/, '');
const corsOrigin = normalizeBaseUrl(
  setting('CORS_ORIGIN', 'http://localhost:5173'),
);
const frontendUrl = normalizeBaseUrl(setting('FRONTEND_URL', corsOrigin));
const smtpHost = setting('SMTP_HOST', undefined);
const consentPolicyVersion = setting('CONSENT_POLICY_VERSION', 'v1');
const trustProxyValue = process.env.TRUST_PROXY?.trim();
if (!isDevLike && !trustProxyValue) {
  throw new Error('Falta la variable de entorno TRUST_PROXY');
}
const trustProxy = trustProxyValue ? Number(trustProxyValue) : false;
if (
  trustProxy !== false &&
  (!Number.isInteger(trustProxy) || trustProxy < 1)
) {
  throw new Error('TRUST_PROXY debe ser un entero positivo');
}

export const env = {
  nodeEnv,
  port: Number(process.env.PORT ?? 3000),
  corsOrigin,
  jwtSecret,
  jwtExpiresIn: process.env.JWT_EXPIRES_IN ?? '1h',
  totpEncryptionKey,
  frontendUrl,
  consentPolicyVersion,
  smtp: {
    host: smtpHost,
    port: Number(process.env.SMTP_PORT ?? 587),
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
    from: process.env.MAIL_FROM ?? 'no-reply@localhost',
  },
  trustProxy,
  get databaseUrl() {
    return required('DATABASE_URL');
  },
};

export const isProduction = nodeEnv === 'production';

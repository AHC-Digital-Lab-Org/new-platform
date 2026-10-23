// Única puerta de entrada a process.env. Las variables se cargan con `node --env-file`.
const required = (name) => {
  const value = process.env[name];
  if (!value) throw new Error(`Falta la variable de entorno ${name}`);
  return value;
};

export const env = {
  nodeEnv: process.env.NODE_ENV ?? 'development',
  port: Number(process.env.PORT ?? 3000),
  corsOrigin: process.env.CORS_ORIGIN ?? 'http://localhost:5173',
  jwtSecret:
    process.env.JWT_SECRET ??
    (process.env.NODE_ENV === 'production'
      ? required('JWT_SECRET')
      : 'dev-secret-no-usar-en-prod'),
  jwtExpiresIn: process.env.JWT_EXPIRES_IN ?? '1h',
  totpEncryptionKey:
    process.env.TOTP_ENCRYPTION_KEY ??
    (process.env.NODE_ENV === 'production'
      ? required('TOTP_ENCRYPTION_KEY')
      : '0000000000000000000000000000000000000000000000000000000000000000'),
  frontendUrl:
    process.env.FRONTEND_URL ??
    process.env.CORS_ORIGIN ??
    'http://localhost:5173',
  smtp: {
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT ?? 587),
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
    from: process.env.MAIL_FROM ?? 'no-reply@localhost',
  },
  trustProxy: process.env.TRUST_PROXY ? Number(process.env.TRUST_PROXY) : false,
  get databaseUrl() {
    return required('DATABASE_URL');
  },
};

export const isProduction = env.nodeEnv === 'production';

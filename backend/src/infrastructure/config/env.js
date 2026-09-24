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
  get databaseUrl() {
    return required('DATABASE_URL');
  },
};

export const isProduction = env.nodeEnv === 'production';

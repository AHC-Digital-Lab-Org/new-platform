// Logger mínimo. Si más adelante hace falta logging estructurado, se sustituye aquí (p. ej. por pino)
// sin tocar el resto del código.
const write = (level) => (message, meta) => {
  const line = `[${new Date().toISOString()}] ${level.toUpperCase()} ${message}`;
  const out = level === 'error' ? console.error : level === 'warn' ? console.warn : console.log;
  meta === undefined ? out(line) : out(line, meta);
};

export const logger = {
  info: write('info'),
  warn: write('warn'),
  error: write('error'),
};

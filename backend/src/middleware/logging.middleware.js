import { logger } from '#infrastructure/logger/logger.js';

export const logging = (req, res, next) => {
  const start = performance.now();
  res.on('finish', () => {
    const ms = (performance.now() - start).toFixed(1);
    logger.info(`${req.method} ${req.originalUrl} ${res.statusCode} ${ms}ms`);
  });
  next();
};

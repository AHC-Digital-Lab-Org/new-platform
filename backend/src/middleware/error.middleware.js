import { AppError } from '#shared/errors/index.js';
import { logger } from '#infrastructure/logger/logger.js';

export const notFoundHandler = (req, res) => {
  res.status(404).json({ error: { code: 'NOT_FOUND', message: `Ruta no encontrada: ${req.method} ${req.originalUrl}` } });
};

// Express 5 captura los errores de funciones async automáticamente y los envía aquí.
export const errorHandler = (err, _req, res, _next) => {
  if (err instanceof AppError) {
    return res.status(err.status).json({ error: { code: err.code, message: err.message, details: err.details } });
  }
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ error: { code: 'INVALID_JSON', message: 'JSON mal formado' } });
  }
  // Prisma: registro no encontrado en update/delete
  if (err.code === 'P2025') {
    return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Recurso no encontrado' } });
  }
  logger.error(err.message, err);
  res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Error interno del servidor' } });
};

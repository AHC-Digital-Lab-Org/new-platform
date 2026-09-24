import { logger } from '#infrastructure/logger/logger.js';

// Servicio transversal de auditoría. De momento solo registra en el log;
// cuando haga falta persistirlo se añade un modelo en prisma/schema/platform.prisma.
export const audit = (action, data = {}) => {
  logger.info(`AUDIT ${action}`, data);
};

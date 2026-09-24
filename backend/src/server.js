import { createApp } from './app.js';
import { env } from '#infrastructure/config/env.js';
import { logger } from '#infrastructure/logger/logger.js';
import { prisma } from '#infrastructure/database/prisma.js';

const server = createApp().listen(env.port, () => {
  logger.info(`API en http://localhost:${env.port}/api  ·  Swagger en http://localhost:${env.port}/api/docs`);
});

const shutdown = async () => {
  server.close();
  await prisma.$disconnect();
  process.exit(0);
};
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

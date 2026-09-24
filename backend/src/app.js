import express from 'express';
import cors from 'cors';
import { env } from '#infrastructure/config/env.js';
import { mountSwagger } from '#infrastructure/openapi/swagger.js';
import { logging } from '#middleware/logging.middleware.js';
import { errorHandler, notFoundHandler } from '#middleware/error.middleware.js';
import { modules } from './modules/index.js';

export const createApp = () => {
  const app = express();

  app.use(cors({ origin: env.corsOrigin }));
  app.use(express.json());
  if (env.nodeEnv !== 'test') app.use(logging);

  /**
   * @openapi
   * /health:
   *   get:
   *     tags: [Sistema]
   *     summary: Comprueba que la API está viva
   *     responses:
   *       200:
   *         description: OK
   */
  app.get('/api/health', (_req, res) => res.json({ status: 'ok' }));

  mountSwagger(app);

  // Cada módulo se monta en /api/<nombre>
  for (const mod of modules) {
    app.use(`/api/${mod.name}`, mod.router);
  }

  app.use('/api', notFoundHandler);
  app.use(errorHandler);

  return app;
};

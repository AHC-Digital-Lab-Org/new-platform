import swaggerJsdoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';

// Cada equipo documenta sus endpoints con comentarios `@openapi` en su *.routes.js.
// Aquí solo se recogen: no hay un fichero OpenAPI central que editar.
export const openapiSpec = swaggerJsdoc({
  definition: {
    openapi: '3.0.3',
    info: { title: 'Web Platform API', version: '0.1.0' },
    servers: [{ url: '/api' }],
    components: {
      schemas: {
        Error: {
          type: 'object',
          properties: {
            error: {
              type: 'object',
              properties: {
                code: { type: 'string' },
                message: { type: 'string' },
                details: {},
              },
            },
          },
        },
      },
    },
  },
  apis: [
    'src/platform/**/*.routes.js',
    'src/modules/**/*.routes.js',
    'src/app.js',
  ],
});

export const mountSwagger = (app) => {
  app.get('/api/docs.json', (_req, res) => res.json(openapiSpec));
  app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(openapiSpec));
};

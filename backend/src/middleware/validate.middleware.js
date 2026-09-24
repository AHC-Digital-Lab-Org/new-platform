import { ValidationError } from '#shared/errors/index.js';

// Uso: router.post('/', validate({ body: schema }), controller)
// Los datos ya validados quedan en req.valid.body / req.valid.query / req.valid.params.
export const validate = (schemas) => (req, _res, next) => {
  req.valid = {};
  for (const [key, schema] of Object.entries(schemas)) {
    const result = schema.safeParse(req[key]);
    if (!result.success) {
      throw new ValidationError(
        result.error.issues.map((i) => ({ path: [key, ...i.path].join('.'), message: i.message })),
      );
    }
    req.valid[key] = result.data;
  }
  next();
};

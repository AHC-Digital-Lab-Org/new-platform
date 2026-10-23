import { AppError } from '#shared/errors/index.js';

export const requireRole = (...roles) => {
  if (roles.length === 0) {
    throw new Error('requireRole necesita al menos un rol');
  }

  return (req, _res, next) => {
    if (!req.auth) {
      throw new AppError(401, 'UNAUTHORIZED', 'Token de autenticación requerido');
    }

    if (!roles.includes(req.auth.tipo)) {
      throw new AppError(403, 'FORBIDDEN', 'No tienes permisos para esta acción');
    }

    return next();
  };
};

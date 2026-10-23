import jwt from 'jsonwebtoken';
import { env } from '#infrastructure/config/env.js';
import { prisma } from '#infrastructure/database/prisma.js';
import { AppError } from '#shared/errors/index.js';

export const authenticate = async (req, _res, next) => {
  const authorization = req.headers.authorization ?? '';
  const [scheme, token, ...extra] = authorization.split(/\s+/);

  if (scheme !== 'Bearer' || !token || extra.length > 0) {
    throw new AppError(401, 'UNAUTHORIZED', 'Token de autenticación requerido');
  }

  let payload;
  try {
    payload = jwt.verify(token, env.jwtSecret, { algorithms: ['HS256'] });
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      throw new AppError(401, 'TOKEN_EXPIRED', 'El token ha expirado');
    }
    throw new AppError(401, 'INVALID_TOKEN', 'Token inválido');
  }

  if (
    typeof payload !== 'object' ||
    payload === null ||
    typeof payload.sub !== 'string' ||
    typeof payload.tipo !== 'string' ||
    payload.purpose
  ) {
    throw new AppError(401, 'INVALID_TOKEN', 'Token inválido');
  }

  const user = await prisma.user.findUnique({
    where: { id: payload.sub },
    select: { tokenVersion: true },
  });

  if (!user) {
    throw new AppError(401, 'UNAUTHORIZED', 'Usuario no encontrado');
  }

  if ((payload.v ?? 0) !== (user.tokenVersion ?? 0)) {
    throw new AppError(
      401,
      'SESSION_REVOKED',
      'La sesión ha sido cerrada. Inicia sesión de nuevo',
    );
  }

  req.auth = { userId: payload.sub, tipo: payload.tipo };
  return next();
};

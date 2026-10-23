import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { env } from '#infrastructure/config/env.js';
import { prisma } from '#infrastructure/database/prisma.js';
import { AppError } from '#shared/errors/index.js';

const SALT_ROUNDS = 10;

export const sanitizeUser = (user) => {
  const { passwordHash, totpSecret, ...safeUser } = user;
  return safeUser;
};

const signToken = (user) =>
  jwt.sign({ sub: user.id, tipo: user.tipoUsuario }, env.jwtSecret, {
    expiresIn: env.jwtExpiresIn,
  });

export const register = async ({
  alias,
  email,
  password,
  nombre,
  ciudad,
  pais,
  consentimientos,
}) => {
  const existing = await prisma.user.findFirst({
    where: {
      OR: [{ email }, { alias }],
    },
  });

  if (existing) {
    const field = existing.email === email ? 'email' : 'alias';

    throw new AppError(
      409,
      'USER_ALREADY_EXISTS',
      `El ${field} ya está en uso`,
    );
  }

  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

  const user = await prisma.user.create({
    data: {
      alias,
      email,
      passwordHash,
      nombre,
      ciudad,
      pais: pais || undefined,
      consentimientos,
      tipoUsuario: 'usuario_registrado',
      estado: 'pendiente_verificacion',
    },
  });

  return sanitizeUser(user);
};

export const login = async ({ email, password }) => {
  const user = await prisma.user.findUnique({ where: { email } });
  const invalid = () =>
    new AppError(401, 'INVALID_CREDENTIALS', 'Email o contraseña incorrectos');

  if (!user || !user.passwordHash) throw invalid();

  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) throw invalid();

  return { token: signToken(user), user: sanitizeUser(user) };
};
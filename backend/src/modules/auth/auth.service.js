import bcrypt from 'bcrypt';
import { prisma } from '#infrastructure/database/prisma.js';
import { AppError } from '#shared/errors/index.js';

const SALT_ROUNDS = 10;

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

export const login = async (_credentials) => {
  throw new Error('Not implemented yet — see Commit 4');
};

export const sanitizeUser = (user) => {
  const { passwordHash, totpSecret, ...safeUser } = user;
  return safeUser;
};
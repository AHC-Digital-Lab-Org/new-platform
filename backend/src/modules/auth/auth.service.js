import crypto from 'node:crypto';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { env } from '#infrastructure/config/env.js';
import { prisma } from '#infrastructure/database/prisma.js';
import { logger } from '#infrastructure/logger/logger.js';
import { sendMail } from '#infrastructure/mail/mailer.js';
import { AppError } from '#shared/errors/index.js';
import { buildVerificationMail } from './auth.mail.js';

const SALT_ROUNDS = 10;
const VERIFICATION_TTL_MS = 24 * 60 * 60 * 1000;

export const sanitizeUser = (user) => {
  const {
    passwordHash,
    totpSecret,
    emailVerificationTokenHash,
    emailVerificationExpires,
    ...safeUser
  } = user;
  return safeUser;
};

const signToken = (user) =>
  jwt.sign({ sub: user.id, tipo: user.tipoUsuario }, env.jwtSecret, {
    expiresIn: env.jwtExpiresIn,
  });

const hashToken = (token) =>
  crypto.createHash('sha256').update(token).digest('hex');

const sendVerification = async (user) => {
  const token = crypto.randomBytes(32).toString('hex');

  await prisma.user.update({
    where: { id: user.id },
    data: {
      emailVerificationTokenHash: hashToken(token),
      emailVerificationExpires: new Date(Date.now() + VERIFICATION_TTL_MS),
    },
  });

  try {
    await sendMail({ to: user.email, ...buildVerificationMail(token) });
  } catch (err) {
    logger.error(
      `No se pudo enviar la verificación al usuario ${user.id}: ${err.message}`,
    );
  }
};

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

  await sendVerification(user);

  return sanitizeUser(user);
};

export const login = async ({ email, password }) => {
  const user = await prisma.user.findUnique({ where: { email } });
  const invalid = () =>
    new AppError(401, 'INVALID_CREDENTIALS', 'Email o contraseña incorrectos');

  if (!user || !user.passwordHash) throw invalid();

  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) throw invalid();

  if (!user.emailVerificado) {
    throw new AppError(
      403,
      'EMAIL_NOT_VERIFIED',
      'Debes verificar tu email antes de iniciar sesión',
    );
  }

  return { token: signToken(user), user: sanitizeUser(user) };
};

export const getProfile = async (userId) => {
  const user = await prisma.user.findUnique({ where: { id: userId } });

  if (!user) {
    throw new AppError(401, 'UNAUTHORIZED', 'Usuario no encontrado');
  }

  return sanitizeUser(user);
};

export const verifyEmail = async (token) => {
  const user = await prisma.user.findUnique({
    where: { emailVerificationTokenHash: hashToken(token) },
  });

  if (
    !user ||
    !user.emailVerificationExpires ||
    user.emailVerificationExpires < new Date()
  ) {
    throw new AppError(
      400,
      'INVALID_VERIFICATION_TOKEN',
      'El enlace de verificación es inválido o ha expirado',
    );
  }

  const verified = await prisma.user.update({
    where: { id: user.id },
    data: {
      emailVerificado: true,
      estado: 'activo',
      emailVerificationTokenHash: null,
      emailVerificationExpires: null,
    },
  });

  return sanitizeUser(verified);
};

export const resendVerification = async (email) => {
  const user = await prisma.user.findUnique({ where: { email } });

  if (user && !user.emailVerificado) {
    await sendVerification(user);
  }
};
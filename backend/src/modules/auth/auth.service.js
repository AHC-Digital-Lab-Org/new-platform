import crypto from 'node:crypto';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import otplib from 'otplib';
import QRCode from 'qrcode';
import { env } from '#infrastructure/config/env.js';
import { prisma } from '#infrastructure/database/prisma.js';
import { logger } from '#infrastructure/logger/logger.js';
import { sendMail } from '#infrastructure/mail/mailer.js';
import { AppError } from '#shared/errors/index.js';
import { buildVerificationMail } from './auth.mail.js';

const { authenticator } = otplib;
authenticator.options = { window: 1 };

const SALT_ROUNDS = 10;
const VERIFICATION_TTL_MS = 24 * 60 * 60 * 1000;
const TWO_FACTOR_TOKEN_TTL = '5m';
const TOTP_ISSUER = 'Plataforma';

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

const signTwoFactorToken = (user) =>
  jwt.sign({ sub: user.id, purpose: '2fa' }, env.jwtSecret, {
    expiresIn: TWO_FACTOR_TOKEN_TTL,
  });

const hashToken = (token) =>
  crypto.createHash('sha256').update(token).digest('hex');

const isValidCode = (code, secret) => {
  try {
    return authenticator.check(code, secret);
  } catch {
    return false;
  }
};

const findUserOrFail = async (userId) => {
  const user = await prisma.user.findUnique({ where: { id: userId } });

  if (!user) {
    throw new AppError(401, 'UNAUTHORIZED', 'Usuario no encontrado');
  }

  return user;
};

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

  if (user.twoFactorOn) {
    return { twoFactorRequired: true, twoFactorToken: signTwoFactorToken(user) };
  }

  return { token: signToken(user), user: sanitizeUser(user) };
};

export const loginWithTwoFactor = async ({ twoFactorToken, code }) => {
  const invalidSession = () =>
    new AppError(
      401,
      'INVALID_TWO_FACTOR_TOKEN',
      'La verificación ha expirado o no es válida. Inicia sesión de nuevo',
    );

  let payload;
  try {
    payload = jwt.verify(twoFactorToken, env.jwtSecret, {
      algorithms: ['HS256'],
    });
  } catch {
    throw invalidSession();
  }

  if (
    typeof payload !== 'object' ||
    payload === null ||
    payload.purpose !== '2fa' ||
    typeof payload.sub !== 'string'
  ) {
    throw invalidSession();
  }

  const user = await prisma.user.findUnique({ where: { id: payload.sub } });
  if (!user || !user.twoFactorOn || !user.totpSecret) throw invalidSession();

  if (!isValidCode(code, user.totpSecret)) {
    throw new AppError(401, 'INVALID_TWO_FACTOR_CODE', 'Código incorrecto');
  }

  return { token: signToken(user), user: sanitizeUser(user) };
};

export const getProfile = async (userId) => {
  const user = await findUserOrFail(userId);

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

export const setupTwoFactor = async (userId) => {
  const user = await findUserOrFail(userId);

  if (user.twoFactorOn) {
    throw new AppError(
      409,
      'TWO_FACTOR_ALREADY_ENABLED',
      'El 2FA ya está activado',
    );
  }

  const secret = authenticator.generateSecret();

  await prisma.user.update({
    where: { id: userId },
    data: { totpSecret: secret },
  });

  const otpauthUrl = authenticator.keyuri(user.email, TOTP_ISSUER, secret);
  const qrCode = await QRCode.toDataURL(otpauthUrl);

  return { secret, otpauthUrl, qrCode };
};

export const enableTwoFactor = async (userId, code) => {
  const user = await findUserOrFail(userId);

  if (user.twoFactorOn) {
    throw new AppError(
      409,
      'TWO_FACTOR_ALREADY_ENABLED',
      'El 2FA ya está activado',
    );
  }
  if (!user.totpSecret) {
    throw new AppError(
      400,
      'TWO_FACTOR_NOT_SETUP',
      'Primero inicia la configuración del 2FA',
    );
  }
  if (!isValidCode(code, user.totpSecret)) {
    throw new AppError(400, 'INVALID_TWO_FACTOR_CODE', 'Código incorrecto');
  }

  const updated = await prisma.user.update({
    where: { id: userId },
    data: { twoFactorOn: true },
  });

  return sanitizeUser(updated);
};

export const disableTwoFactor = async (userId, { password, code }) => {
  const user = await findUserOrFail(userId);

  if (!user.twoFactorOn || !user.totpSecret) {
    throw new AppError(
      400,
      'TWO_FACTOR_NOT_ENABLED',
      'El 2FA no está activado',
    );
  }

  const passwordOk = user.passwordHash
    ? await bcrypt.compare(password, user.passwordHash)
    : false;
  if (!passwordOk) {
    throw new AppError(400, 'INVALID_PASSWORD', 'Contraseña incorrecta');
  }

  if (!isValidCode(code, user.totpSecret)) {
    throw new AppError(400, 'INVALID_TWO_FACTOR_CODE', 'Código incorrecto');
  }

  const updated = await prisma.user.update({
    where: { id: userId },
    data: { twoFactorOn: false, totpSecret: null },
  });

  return sanitizeUser(updated);
};
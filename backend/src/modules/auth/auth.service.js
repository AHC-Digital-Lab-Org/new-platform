import crypto from 'node:crypto';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import otplib from 'otplib';
import QRCode from 'qrcode';
import { env } from '#infrastructure/config/env.js';
import { prisma } from '#infrastructure/database/prisma.js';
import { logger } from '#infrastructure/logger/logger.js';
import { sendMail } from '#infrastructure/mail/mailer.js';
import { decryptSecret, encryptSecret } from '#shared/crypto/secret-box.js';
import { AppError } from '#shared/errors/index.js';
import {
  buildPasswordChangedMail,
  buildPasswordResetMail,
  buildVerificationMail,
} from './auth.mail.js';

const { authenticator } = otplib;
authenticator.options = { window: 1 };

const SALT_ROUNDS = 10;
const VERIFICATION_TTL_MS = 24 * 60 * 60 * 1000;
const PASSWORD_RESET_TTL_MS = 60 * 60 * 1000;
const TWO_FACTOR_TOKEN_TTL = '5m';
const TOTP_ISSUER = 'Plataforma';

export const sanitizeUser = (user) => {
  const {
    passwordHash,
    totpSecret,
    emailVerificationTokenHash,
    emailVerificationExpires,
    passwordResetTokenHash,
    passwordResetExpires,
    tokenVersion,
    ...safeUser
  } = user;
  return safeUser;
};

const signToken = (user) =>
  jwt.sign(
    { sub: user.id, tipo: user.tipoUsuario, v: user.tokenVersion ?? 0 },
    env.jwtSecret,
    { expiresIn: env.jwtExpiresIn },
  );

const signTwoFactorToken = (user) =>
  jwt.sign({ sub: user.id, purpose: '2fa' }, env.jwtSecret, {
    expiresIn: TWO_FACTOR_TOKEN_TTL,
  });

const hashToken = (token) =>
  crypto.createHash('sha256').update(token).digest('hex');

const isValidCode = (code, storedSecret) => {
  try {
    return authenticator.check(code, decryptSecret(storedSecret));
  } catch {
    return false;
  }
};

const RECOVERY_CODE_COUNT = 10;
const RECOVERY_ALPHABET = 'abcdefghjkmnpqrstuvwxyz23456789';
const TOTP_FORMAT = /^\d{6}$/;

const randomChunk = (length) =>
  Array.from(
    { length },
    () => RECOVERY_ALPHABET[crypto.randomInt(RECOVERY_ALPHABET.length)],
  ).join('');

const generateRecoveryCodes = () =>
  Array.from(
    { length: RECOVERY_CODE_COUNT },
    () => `${randomChunk(4)}-${randomChunk(4)}-${randomChunk(4)}`,
  );

const hashRecoveryCode = (code) =>
  hashToken(code.toLowerCase().replace(/[^a-z0-9]/g, ''));

const buildRecoveryCodeOps = (userId) => {
  const codes = generateRecoveryCodes();

  return {
    codes,
    ops: [
      prisma.recoveryCode.deleteMany({ where: { userId } }),
      prisma.recoveryCode.createMany({
        data: codes.map((code) => ({
          userId,
          codeHash: hashRecoveryCode(code),
        })),
      }),
    ],
  };
};

const verifySecondFactor = async (user, code) => {
  if (TOTP_FORMAT.test(code)) {
    return isValidCode(code, user.totpSecret) ? 'totp' : null;
  }

  const { count } = await prisma.recoveryCode.updateMany({
    where: {
      userId: user.id,
      codeHash: hashRecoveryCode(code),
      usedAt: null,
    },
    data: { usedAt: new Date() },
  });

  return count === 1 ? 'recovery' : null;
};

const assertReauthenticated = async (user, { password, code }) => {
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

  if (!(await verifySecondFactor(user, code))) {
    throw new AppError(400, 'INVALID_TWO_FACTOR_CODE', 'Código incorrecto');
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

  const method = await verifySecondFactor(user, code);
  if (!method) {
    throw new AppError(401, 'INVALID_TWO_FACTOR_CODE', 'Código incorrecto');
  }

  const result = { token: signToken(user), user: sanitizeUser(user) };

  if (method === 'recovery') {
    result.recoveryCodesRemaining = await prisma.recoveryCode.count({
      where: { userId: user.id, usedAt: null },
    });
  }

  return result;
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
    data: { totpSecret: encryptSecret(secret) },
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

  const { codes, ops } = buildRecoveryCodeOps(userId);
  const [updated] = await prisma.$transaction([
    prisma.user.update({
      where: { id: userId },
      data: { twoFactorOn: true },
    }),
    ...ops,
  ]);

  return { user: sanitizeUser(updated), recoveryCodes: codes };
};

export const disableTwoFactor = async (userId, credentials) => {
  const user = await findUserOrFail(userId);

  await assertReauthenticated(user, credentials);

  const [updated] = await prisma.$transaction([
    prisma.user.update({
      where: { id: userId },
      data: { twoFactorOn: false, totpSecret: null },
    }),
    prisma.recoveryCode.deleteMany({ where: { userId } }),
  ]);

  return sanitizeUser(updated);
};

export const regenerateRecoveryCodes = async (userId, credentials) => {
  const user = await findUserOrFail(userId);

  await assertReauthenticated(user, credentials);

  const { codes, ops } = buildRecoveryCodeOps(userId);
  await prisma.$transaction(ops);

  return codes;
};

export const forgotPassword = async (email) => {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) return;

  const token = crypto.randomBytes(32).toString('hex');

  await prisma.user.update({
    where: { id: user.id },
    data: {
      passwordResetTokenHash: hashToken(token),
      passwordResetExpires: new Date(Date.now() + PASSWORD_RESET_TTL_MS),
    },
  });

  try {
    await sendMail({ to: user.email, ...buildPasswordResetMail(token) });
  } catch (err) {
    logger.error(
      `No se pudo enviar el reset de contraseña al usuario ${user.id}: ${err.message}`,
    );
  }
};

export const resetPassword = async ({ token, password }) => {
  const tokenHash = hashToken(token);
  const invalid = () =>
    new AppError(400, 'INVALID_RESET_TOKEN', 'El enlace es inválido o ha expirado');

  const user = await prisma.user.findUnique({
    where: { passwordResetTokenHash: tokenHash },
  });
  if (!user) throw invalid();

  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

  const { count } = await prisma.user.updateMany({
    where: {
      passwordResetTokenHash: tokenHash,
      passwordResetExpires: { gt: new Date() },
    },
    data: {
      passwordHash,
      passwordResetTokenHash: null,
      passwordResetExpires: null,
      tokenVersion: { increment: 1 },
    },
  });

  if (count !== 1) throw invalid();

  try {
    await sendMail({ to: user.email, ...buildPasswordChangedMail() });
  } catch (err) {
    logger.error(
      `No se pudo enviar el aviso de cambio de contraseña al usuario ${user.id}: ${err.message}`,
    );
  }
};

export const logoutAll = async (userId) => {
  await prisma.user.update({
    where: { id: userId },
    data: { tokenVersion: { increment: 1 } },
  });
};

export const changePassword = async (userId, { currentPassword, newPassword }) => {
  const user = await findUserOrFail(userId);

  const currentOk = user.passwordHash
    ? await bcrypt.compare(currentPassword, user.passwordHash)
    : false;
  if (!currentOk) {
    throw new AppError(400, 'INVALID_PASSWORD', 'La contraseña actual es incorrecta');
  }

  if (currentPassword === newPassword) {
    throw new AppError(
      400,
      'SAME_PASSWORD',
      'La nueva contraseña debe ser distinta de la actual',
    );
  }

  const passwordHash = await bcrypt.hash(newPassword, SALT_ROUNDS);
  const updated = await prisma.user.update({
    where: { id: userId },
    data: {
      passwordHash,
      tokenVersion: { increment: 1 },
      passwordResetTokenHash: null,
      passwordResetExpires: null,
    },
  });

  try {
    await sendMail({ to: user.email, ...buildPasswordChangedMail() });
  } catch (err) {
    logger.error(
      `No se pudo enviar el aviso de cambio de contraseña al usuario ${user.id}: ${err.message}`,
    );
  }

  return { token: signToken(updated), user: sanitizeUser(updated) };
};
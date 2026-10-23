import crypto from 'node:crypto';
import { rateLimit } from 'express-rate-limit';
import { env } from '#infrastructure/config/env.js';
import { AppError } from '#shared/errors/index.js';

const MINUTE = 60 * 1000;
const HOUR = 60 * MINUTE;

const create = ({
  windowMs,
  limit,
  keyGenerator,
  skipSuccessfulRequests = false,
}) =>
  rateLimit({
    windowMs,
    limit,
    skipSuccessfulRequests,
    standardHeaders: true,
    legacyHeaders: false,
    ...(keyGenerator && { keyGenerator }),
    skip: () =>
      env.nodeEnv === 'test' && process.env.RATE_LIMIT_IN_TEST !== 'true',
    handler: (_req, _res, next) =>
      next(
        new AppError(
          429,
          'TOO_MANY_REQUESTS',
          'Demasiados intentos. Inténtalo de nuevo más tarde',
        ),
      ),
  });

const sha = (value) =>
  crypto.createHash('sha256').update(String(value)).digest('hex');

export const registerLimiter = create({ windowMs: HOUR, limit: 5 });

export const loginLimiter = create({
  windowMs: 15 * MINUTE,
  limit: 10,
  skipSuccessfulRequests: true,
});

export const resendVerificationLimiter = create({ windowMs: HOUR, limit: 5 });

export const twoFactorLoginIpLimiter = create({
  windowMs: 15 * MINUTE,
  limit: 20,
  skipSuccessfulRequests: true,
});

export const twoFactorLoginTokenLimiter = create({
  windowMs: 5 * MINUTE,
  limit: 5,
  skipSuccessfulRequests: true,
  keyGenerator: (req) =>
    sha(req.valid?.body?.twoFactorToken ?? 'none'),
});

export const twoFactorManageLimiter = create({
  windowMs: 15 * MINUTE,
  limit: 5,
  skipSuccessfulRequests: true,
  keyGenerator: (req) => `user:${req.auth.userId}`,
});

export const forgotPasswordLimiter = create({ windowMs: HOUR, limit: 5 });

export const resetPasswordLimiter = create({
  windowMs: 15 * MINUTE,
  limit: 10,
  skipSuccessfulRequests: true,
});

import crypto from 'node:crypto';
import jwt from 'jsonwebtoken';
import { ipKeyGenerator, rateLimit } from 'express-rate-limit';
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
const normalizedEmail = (req) =>
  String(req.valid?.body?.email ?? req.body?.email ?? '')
    .trim()
    .toLowerCase();
const emailKey = (req) => sha(normalizedEmail(req));
const ipAndEmailKey = (req) =>
  `${ipKeyGenerator(req.ip)}:${emailKey(req)}`;

export const registerLimiter = create({ windowMs: HOUR, limit: 5 });
export const registerEmailLimiter = create({
  windowMs: HOUR,
  limit: 5,
  keyGenerator: emailKey,
});

export const loginLimiter = create({
  windowMs: 15 * MINUTE,
  limit: 10,
  skipSuccessfulRequests: true,
  keyGenerator: ipAndEmailKey,
});

export const loginEmailLimiter = create({
  windowMs: 15 * MINUTE,
  limit: 10,
  skipSuccessfulRequests: true,
  keyGenerator: emailKey,
});

export const resendVerificationLimiter = create({ windowMs: HOUR, limit: 5 });
export const resendVerificationEmailLimiter = create({
  windowMs: HOUR,
  limit: 5,
  keyGenerator: emailKey,
});

export const twoFactorLoginIpLimiter = create({
  windowMs: 15 * MINUTE,
  limit: 20,
  skipSuccessfulRequests: true,
});

export const twoFactorLoginUserLimiter = create({
  windowMs: 15 * MINUTE,
  limit: 5,
  skipSuccessfulRequests: true,
  keyGenerator: (req) => {
    const token = req.valid?.body?.twoFactorToken ?? '';
    try {
      const payload = jwt.verify(token, env.jwtSecret, {
        algorithms: ['HS256'],
      });
      if (
        typeof payload === 'object' &&
        payload !== null &&
        payload.purpose === '2fa' &&
        typeof payload.sub === 'string'
      ) {
        return `user:${sha(payload.sub)}`;
      }
    } catch {
      return `ip:${ipKeyGenerator(req.ip)}`;
    }
    return `ip:${ipKeyGenerator(req.ip)}`;
  },
});

export const twoFactorManageLimiter = create({
  windowMs: 15 * MINUTE,
  limit: 5,
  skipSuccessfulRequests: true,
  keyGenerator: (req) => `user:${req.auth.userId}`,
});

export const forgotPasswordLimiter = create({ windowMs: HOUR, limit: 5 });
export const forgotPasswordEmailLimiter = create({
  windowMs: HOUR,
  limit: 5,
  keyGenerator: emailKey,
});

export const locationsLimiter = create({
  windowMs: MINUTE,
  limit: 60,
});

export const resetPasswordLimiter = create({
  windowMs: 15 * MINUTE,
  limit: 10,
  skipSuccessfulRequests: true,
});

export const changePasswordLimiter = create({
  windowMs: 15 * MINUTE,
  limit: 5,
  skipSuccessfulRequests: true,
  keyGenerator: (req) => `user:${req.auth.userId}`,
});

export const chatbotLimiter = create({
  windowMs: 15 * MINUTE,
  limit: 30,
});

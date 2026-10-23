import { z } from 'zod';

export const registerSchema = z.object({
  alias: z.string().min(3).max(30),
  email: z.string().email(),
  password: z.string().min(8),
  nombre: z.string().optional(),
  ciudad: z.string().optional(),
  pais: z.string().optional(),
  consentimientos: z.record(z.any()),
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const verifyEmailSchema = z.object({
  token: z.string().min(1),
});

export const resendVerificationSchema = z.object({
  email: z.string().email(),
});

const codeSchema = z.string().regex(/^\d{6}$/, 'El código debe tener 6 dígitos');

const secondFactorCodeSchema = z.string().trim().min(6).max(32);

export const twoFactorCodeSchema = z.object({
  code: codeSchema,
});

export const twoFactorLoginSchema = z.object({
  twoFactorToken: z.string().min(1),
  code: secondFactorCodeSchema,
});

export const twoFactorDisableSchema = z.object({
  password: z.string().min(1),
  code: secondFactorCodeSchema,
});

export const twoFactorRegenerateSchema = z.object({
  password: z.string().min(1),
  code: secondFactorCodeSchema,
});

export const forgotPasswordSchema = z.object({
  email: z.string().email(),
});

export const resetPasswordSchema = z.object({
  token: z.string().min(1),
  password: z.string().min(8),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8),
});
import { z } from 'zod';
import {
  ALIAS_POLICY_MESSAGE,
  isAliasAllowed,
} from '../../../../shared/alias-policy.js';
import {
  getCountryCode,
  isValidCity,
} from '../../../../shared/location-catalog.js';

export const registerSchema = z
  .object({
    alias: z
      .string()
      .trim()
      .min(3)
      .max(30)
      .refine(isAliasAllowed, ALIAS_POLICY_MESSAGE),
    email: z.string().email(),
    password: z.string().min(8),
    nombre: z.string().trim().optional(),
    ciudad: z.string().trim().optional(),
    pais: z.string().trim().optional(),
    consentimientos: z.record(z.any()),
  })
  .superRefine(({ ciudad, pais }, context) => {
    const countryCode = pais ? getCountryCode(pais) : undefined;

    if (pais && !countryCode) {
      context.addIssue({
        code: 'custom',
        path: ['pais'],
        message: 'Selecciona un país válido.',
      });
    }
    if (ciudad && !countryCode) {
      context.addIssue({
        code: 'custom',
        path: ['ciudad'],
        message: 'Selecciona primero un país válido.',
      });
    } else if (ciudad && !isValidCity(countryCode, ciudad)) {
      context.addIssue({
        code: 'custom',
        path: ['ciudad'],
        message: 'Selecciona una ciudad válida para el país elegido.',
      });
    }
  });

export const citiesQuerySchema = z.object({
  country: z.string().regex(/^[A-Z]{2}$/),
  q: z.string().trim().min(1).max(80),
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
import { describe, expect, it } from 'vitest';
import {
  changePasswordSchema,
  loginSchema,
  registerSchema,
  resetPasswordSchema,
} from '../auth.schema.js';

const validRegistration = {
  alias: 'persona',
  email: ' Persona@Example.COM ',
  password: 'password123',
  consentimientos: { terminos: true, privacidad: true },
};

describe('Auth schemas', () => {
  it('normaliza emails con espacios y mayúsculas', () => {
    expect(loginSchema.parse(validRegistration).email).toBe(
      'persona@example.com',
    );
    expect(registerSchema.parse(validRegistration).email).toBe(
      'persona@example.com',
    );
  });

  it('rechaza una entrada SQL como email antes de acceder al servicio', () => {
    expect(
      loginSchema.safeParse({
        email: "' OR '1'='1",
        password: 'password123',
      }).success,
    ).toBe(false);
  });

  it('rechaza contraseñas de más de 72 bytes en alta, reset y cambio', () => {
    const longPassword = 'a'.repeat(73);

    expect(
      registerSchema.safeParse({
        ...validRegistration,
        password: longPassword,
      }).success,
    ).toBe(false);
    expect(
      resetPasswordSchema.safeParse({
        token: 'token',
        password: longPassword,
      }).success,
    ).toBe(false);
    expect(
      changePasswordSchema.safeParse({
        currentPassword: 'password123',
        newPassword: longPassword,
      }).success,
    ).toBe(false);
  });

  it('limita por bytes UTF-8, no solo por número de caracteres', () => {
    expect(
      resetPasswordSchema.safeParse({
        token: 'token',
        password: 'á'.repeat(37),
      }).success,
    ).toBe(false);
  });
});

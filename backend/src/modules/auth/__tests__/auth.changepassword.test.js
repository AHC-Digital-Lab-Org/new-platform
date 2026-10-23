import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import { env } from '#infrastructure/config/env.js';

const { findUnique, update, compare, hash, sendMail } = vi.hoisted(() => ({
  findUnique: vi.fn(),
  update: vi.fn(),
  compare: vi.fn(),
  hash: vi.fn(),
  sendMail: vi.fn(),
}));

vi.mock('#infrastructure/database/prisma.js', () => ({
  prisma: { user: { findUnique, update, findFirst: vi.fn(), create: vi.fn() } },
}));

vi.mock('bcrypt', () => ({ default: { compare, hash } }));
vi.mock('#infrastructure/mail/mailer.js', () => ({ sendMail }));

const baseUser = {
  id: 'user-1',
  alias: 'usuario',
  email: 'usuario@example.com',
  passwordHash: 'old-hash',
  totpSecret: null,
  tipoUsuario: 'usuario_registrado',
  estado: 'activo',
  emailVerificado: true,
  twoFactorOn: false,
  tokenVersion: 0,
  consentimientos: {},
};

const sessionToken = () =>
  jwt.sign({ sub: 'user-1', tipo: 'usuario_registrado', v: 0 }, env.jwtSecret, {
    expiresIn: '1h',
  });

let app;
let currentUser;

const send = (body) =>
  request(app)
    .post('/api/auth/change-password')
    .set('Authorization', `Bearer ${sessionToken()}`)
    .send(body);

beforeAll(async () => {
  const { createApp } = await import('../../../app.js');
  app = createApp();
});

beforeEach(() => {
  vi.clearAllMocks();
  currentUser = baseUser;
  findUnique.mockImplementation(async (args) =>
    args.select
      ? { tokenVersion: currentUser.tokenVersion, tipoUsuario: currentUser.tipoUsuario }
      : currentUser,
  );
  compare.mockResolvedValue(true);
  hash.mockResolvedValue('new-hash');
  update.mockResolvedValue({
    ...baseUser,
    passwordHash: 'new-hash',
    tokenVersion: 1,
  });
});

describe('Auth endpoint — change-password', () => {
  it('cambia la contraseña, revoca las demás sesiones y devuelve un token nuevo', async () => {
    const response = await send({
      currentPassword: 'vieja-password',
      newPassword: 'nueva-password-123',
    });

    expect(response.status).toBe(200);
    expect(compare).toHaveBeenCalledWith('vieja-password', 'old-hash');
    expect(hash).toHaveBeenCalledWith('nueva-password-123', 10);
    expect(update).toHaveBeenCalledWith({
      where: { id: 'user-1' },
      data: {
        passwordHash: 'new-hash',
        tokenVersion: { increment: 1 },
        passwordResetTokenHash: null,
        passwordResetExpires: null,
      },
    });

    const payload = jwt.verify(response.body.token, env.jwtSecret);
    expect(payload.sub).toBe('user-1');
    expect(payload.v).toBe(1);

    expect(response.body.user.email).toBe('usuario@example.com');
    expect(response.body.user).not.toHaveProperty('passwordHash');
    expect(response.body.user).not.toHaveProperty('tokenVersion');
  });

  it('envía un aviso de cambio de contraseña', async () => {
    await send({
      currentPassword: 'vieja-password',
      newPassword: 'nueva-password-123',
    });

    expect(sendMail).toHaveBeenCalledTimes(1);
    expect(sendMail.mock.calls[0][0].to).toBe('usuario@example.com');
    expect(sendMail.mock.calls[0][0].subject).toBe('Tu contraseña ha sido cambiada');
  });

  it('responde 200 aunque el aviso no se pueda enviar', async () => {
    sendMail.mockRejectedValueOnce(new Error('SMTP caído'));

    const response = await send({
      currentPassword: 'vieja-password',
      newPassword: 'nueva-password-123',
    });

    expect(response.status).toBe(200);
  });

  it('responde 400 con la contraseña actual incorrecta', async () => {
    compare.mockResolvedValue(false);

    const response = await send({
      currentPassword: 'mala',
      newPassword: 'nueva-password-123',
    });

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('INVALID_PASSWORD');
    expect(hash).not.toHaveBeenCalled();
    expect(update).not.toHaveBeenCalled();
  });

  it('responde 400 si el usuario no tiene contraseña', async () => {
    currentUser = { ...baseUser, passwordHash: null };

    const response = await send({
      currentPassword: 'cualquiera',
      newPassword: 'nueva-password-123',
    });

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('INVALID_PASSWORD');
    expect(compare).not.toHaveBeenCalled();
    expect(update).not.toHaveBeenCalled();
  });

  it('responde 400 si la nueva contraseña es igual a la actual', async () => {
    const response = await send({
      currentPassword: 'misma-password-1',
      newPassword: 'misma-password-1',
    });

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('SAME_PASSWORD');
    expect(hash).not.toHaveBeenCalled();
    expect(update).not.toHaveBeenCalled();
  });

  it('responde 400 si la nueva contraseña es demasiado corta', async () => {
    const response = await send({
      currentPassword: 'vieja-password',
      newPassword: '123',
    });

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('VALIDATION_ERROR');
    expect(compare).not.toHaveBeenCalled();
    expect(update).not.toHaveBeenCalled();
  });

  it('responde 401 sin token', async () => {
    const response = await request(app)
      .post('/api/auth/change-password')
      .send({
        currentPassword: 'vieja-password',
        newPassword: 'nueva-password-123',
      });

    expect(response.status).toBe(401);
    expect(update).not.toHaveBeenCalled();
  });
});

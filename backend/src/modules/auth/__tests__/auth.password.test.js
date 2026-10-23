import { createHash } from 'node:crypto';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import request from 'supertest';

const { findUnique, update, updateMany, hash, sendMail } = vi.hoisted(() => ({
  findUnique: vi.fn(),
  update: vi.fn(),
  updateMany: vi.fn(),
  hash: vi.fn(),
  sendMail: vi.fn(),
}));

vi.mock('#infrastructure/database/prisma.js', () => ({
  prisma: {
    user: { findUnique, update, updateMany, findFirst: vi.fn(), create: vi.fn() },
  },
}));

vi.mock('bcrypt', () => ({ default: { hash, compare: vi.fn() } }));
vi.mock('#infrastructure/mail/mailer.js', () => ({ sendMail }));

const sha = (value) => createHash('sha256').update(value).digest('hex');

const user = {
  id: 'user-1',
  alias: 'usuario',
  email: 'usuario@example.com',
  passwordHash: 'old-hash',
  estado: 'activo',
  emailVerificado: true,
};

let app;

beforeAll(async () => {
  const { createApp } = await import('../../../app.js');
  app = createApp();
});

beforeEach(() => {
  vi.clearAllMocks();
  hash.mockResolvedValue('new-hash');
});

describe('Auth endpoint — forgot-password', () => {
  it('guarda solo el hash del token y envía el correo', async () => {
    findUnique.mockResolvedValue(user);

    const response = await request(app)
      .post('/api/auth/forgot-password')
      .send({ email: 'usuario@example.com' });

    expect(response.status).toBe(200);

    const { where, data } = update.mock.calls[0][0];
    expect(where).toEqual({ id: 'user-1' });
    expect(data.passwordResetTokenHash).toMatch(/^[a-f0-9]{64}$/);
    expect(data.passwordResetExpires).toBeInstanceOf(Date);

    const mail = sendMail.mock.calls[0][0];
    expect(mail.to).toBe('usuario@example.com');
    expect(mail.text).toContain('reset-password?token=');
    expect(mail.text).not.toContain(data.passwordResetTokenHash);
  });

  it('responde 200 sin enviar nada si el email no existe', async () => {
    findUnique.mockResolvedValue(null);

    const response = await request(app)
      .post('/api/auth/forgot-password')
      .send({ email: 'nadie@example.com' });

    expect(response.status).toBe(200);
    expect(update).not.toHaveBeenCalled();
    expect(sendMail).not.toHaveBeenCalled();
  });

  it('responde 200 aunque el correo no se pueda enviar', async () => {
    findUnique.mockResolvedValue(user);
    sendMail.mockRejectedValueOnce(new Error('SMTP caído'));

    const response = await request(app)
      .post('/api/auth/forgot-password')
      .send({ email: 'usuario@example.com' });

    expect(response.status).toBe(200);
  });

  it('responde 400 con un email inválido', async () => {
    const response = await request(app)
      .post('/api/auth/forgot-password')
      .send({ email: 'no-es-email' });

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('VALIDATION_ERROR');
    expect(findUnique).not.toHaveBeenCalled();
  });
});

describe('Auth endpoint — reset-password', () => {
  beforeEach(() => {
    findUnique.mockResolvedValue({
      ...user,
      passwordResetTokenHash: sha('token-abc'),
    });
  });

  it('cambia la contraseña y consume el token', async () => {
    updateMany.mockResolvedValue({ count: 1 });

    const response = await request(app)
      .post('/api/auth/reset-password')
      .send({ token: 'token-abc', password: 'nueva-password-123' });

    expect(response.status).toBe(200);
    expect(findUnique).toHaveBeenCalledWith({
      where: { passwordResetTokenHash: sha('token-abc') },
    });
    expect(hash).toHaveBeenCalledWith('nueva-password-123', 10);
    expect(updateMany).toHaveBeenCalledWith({
      where: {
        passwordResetTokenHash: sha('token-abc'),
        passwordResetExpires: { gt: expect.any(Date) },
      },
      data: {
        passwordHash: 'new-hash',
        passwordResetTokenHash: null,
        passwordResetExpires: null,
        tokenVersion: { increment: 1 },
      },
    });
  });

  it('envía un aviso de cambio de contraseña', async () => {
    updateMany.mockResolvedValue({ count: 1 });

    await request(app)
      .post('/api/auth/reset-password')
      .send({ token: 'token-abc', password: 'nueva-password-123' });

    expect(sendMail).toHaveBeenCalledTimes(1);
    expect(sendMail.mock.calls[0][0].to).toBe('usuario@example.com');
    expect(sendMail.mock.calls[0][0].subject).toBe(
      'Tu contraseña ha sido cambiada',
    );
  });

  it('responde 200 aunque el aviso no se pueda enviar', async () => {
    updateMany.mockResolvedValue({ count: 1 });
    sendMail.mockRejectedValueOnce(new Error('SMTP caído'));

    const response = await request(app)
      .post('/api/auth/reset-password')
      .send({ token: 'token-abc', password: 'nueva-password-123' });

    expect(response.status).toBe(200);
  });

  it('responde 400 si el token no existe', async () => {
    findUnique.mockResolvedValue(null);

    const response = await request(app)
      .post('/api/auth/reset-password')
      .send({ token: 'token-malo', password: 'nueva-password-123' });

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('INVALID_RESET_TOKEN');
    expect(hash).not.toHaveBeenCalled();
    expect(updateMany).not.toHaveBeenCalled();
  });

  it('responde 400 si el token expiró o ya se usó', async () => {
    updateMany.mockResolvedValue({ count: 0 });

    const response = await request(app)
      .post('/api/auth/reset-password')
      .send({ token: 'token-malo', password: 'nueva-password-123' });

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('INVALID_RESET_TOKEN');
    expect(sendMail).not.toHaveBeenCalled();
  });

  it('responde 400 si la contraseña es demasiado corta', async () => {
    const response = await request(app)
      .post('/api/auth/reset-password')
      .send({ token: 'token-abc', password: '123' });

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('VALIDATION_ERROR');
    expect(findUnique).not.toHaveBeenCalled();
    expect(hash).not.toHaveBeenCalled();
    expect(updateMany).not.toHaveBeenCalled();
  });
});

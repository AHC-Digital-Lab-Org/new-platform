import { createHash } from 'node:crypto';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import request from 'supertest';

const { findUnique, update, sendMail } = vi.hoisted(() => ({
  findUnique: vi.fn(),
  update: vi.fn(),
  sendMail: vi.fn(),
}));

vi.mock('#infrastructure/database/prisma.js', () => ({
  prisma: { user: { findUnique, update, findFirst: vi.fn(), create: vi.fn() } },
}));

vi.mock('#infrastructure/mail/mailer.js', () => ({ sendMail }));

const sha = (value) => createHash('sha256').update(value).digest('hex');

const pendingUser = {
  id: 'user-1',
  alias: 'usuario',
  email: 'usuario@example.com',
  passwordHash: 'hashed-password',
  totpSecret: null,
  tipoUsuario: 'usuario_registrado',
  estado: 'pendiente_verificacion',
  emailVerificado: false,
  emailVerificationTokenHash: sha('token-abc'),
  emailVerificationExpires: new Date(Date.now() + 60 * 60 * 1000),
  twoFactorOn: false,
  consentimientos: {},
};

describe('Auth endpoint — verify-email', () => {
  let app;

  beforeAll(async () => {
    const { createApp } = await import('../../../app.js');
    app = createApp();
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('verifica el email con un token válido', async () => {
    findUnique.mockResolvedValue(pendingUser);
    update.mockResolvedValue({
      ...pendingUser,
      emailVerificado: true,
      estado: 'activo',
      emailVerificationTokenHash: null,
      emailVerificationExpires: null,
    });

    const response = await request(app)
      .post('/api/auth/verify-email')
      .send({ token: 'token-abc' });

    expect(response.status).toBe(200);
    expect(findUnique).toHaveBeenCalledWith({
      where: { emailVerificationTokenHash: sha('token-abc') },
    });
    expect(update).toHaveBeenCalledWith({
      where: { id: 'user-1' },
      data: {
        emailVerificado: true,
        estado: 'activo',
        emailVerificationTokenHash: null,
        emailVerificationExpires: null,
      },
    });
    expect(response.body.user.emailVerificado).toBe(true);
    expect(response.body.user).not.toHaveProperty('passwordHash');
    expect(response.body.user).not.toHaveProperty('emailVerificationTokenHash');
  });

  it('responde 400 con token desconocido', async () => {
    findUnique.mockResolvedValue(null);

    const response = await request(app)
      .post('/api/auth/verify-email')
      .send({ token: 'no-existe' });

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('INVALID_VERIFICATION_TOKEN');
    expect(update).not.toHaveBeenCalled();
  });

  it('responde 400 con token expirado', async () => {
    findUnique.mockResolvedValue({
      ...pendingUser,
      emailVerificationExpires: new Date(Date.now() - 1000),
    });

    const response = await request(app)
      .post('/api/auth/verify-email')
      .send({ token: 'token-abc' });

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('INVALID_VERIFICATION_TOKEN');
    expect(update).not.toHaveBeenCalled();
  });

  it('responde 400 si falta el token', async () => {
    const response = await request(app)
      .post('/api/auth/verify-email')
      .send({});

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('VALIDATION_ERROR');
    expect(findUnique).not.toHaveBeenCalled();
  });
});

describe('Auth endpoint — resend-verification', () => {
  let app;

  beforeAll(async () => {
    const { createApp } = await import('../../../app.js');
    app = createApp();
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('reenvía el correo si el usuario no está verificado', async () => {
    findUnique.mockResolvedValue(pendingUser);

    const response = await request(app)
      .post('/api/auth/resend-verification')
      .send({ email: 'usuario@example.com' });

    expect(response.status).toBe(200);
    expect(update).toHaveBeenCalledTimes(1);
    expect(sendMail).toHaveBeenCalledTimes(1);
    expect(sendMail.mock.calls[0][0].to).toBe('usuario@example.com');
  });

  it('responde 200 sin enviar nada si el email no existe', async () => {
    findUnique.mockResolvedValue(null);

    const response = await request(app)
      .post('/api/auth/resend-verification')
      .send({ email: 'nadie@example.com' });

    expect(response.status).toBe(200);
    expect(sendMail).not.toHaveBeenCalled();
  });

  it('responde 200 sin enviar nada si ya está verificado', async () => {
    findUnique.mockResolvedValue({ ...pendingUser, emailVerificado: true });

    const response = await request(app)
      .post('/api/auth/resend-verification')
      .send({ email: 'usuario@example.com' });

    expect(response.status).toBe(200);
    expect(sendMail).not.toHaveBeenCalled();
  });
});

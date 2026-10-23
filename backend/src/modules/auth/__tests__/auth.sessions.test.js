import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import { env } from '#infrastructure/config/env.js';

const { findUnique, update, compare } = vi.hoisted(() => ({
  findUnique: vi.fn(),
  update: vi.fn(),
  compare: vi.fn(),
}));

vi.mock('#infrastructure/database/prisma.js', () => ({
  prisma: { user: { findUnique, update, findFirst: vi.fn(), create: vi.fn() } },
}));

vi.mock('bcrypt', () => ({ default: { compare, hash: vi.fn() } }));
vi.mock('#infrastructure/mail/mailer.js', () => ({ sendMail: vi.fn() }));

const baseUser = {
  id: 'user-1',
  alias: 'usuario',
  email: 'usuario@example.com',
  passwordHash: 'hashed-password',
  totpSecret: null,
  tipoUsuario: 'usuario_registrado',
  estado: 'activo',
  emailVerificado: true,
  twoFactorOn: false,
  tokenVersion: 0,
  consentimientos: {},
};

const token = (claims = {}) =>
  jwt.sign(
    { sub: 'user-1', tipo: 'usuario_registrado', ...claims },
    env.jwtSecret,
    { expiresIn: '1h' },
  );

let app;

beforeAll(async () => {
  const { createApp } = await import('../../../app.js');
  app = createApp();
});

beforeEach(() => {
  vi.clearAllMocks();
  findUnique.mockResolvedValue(baseUser);
  compare.mockResolvedValue(true);
});

describe('Auth — revocación de sesiones', () => {
  it('rechaza con 401 SESSION_REVOKED un token de una versión anterior', async () => {
    findUnique.mockResolvedValue({ ...baseUser, tokenVersion: 1 });

    const response = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${token({ v: 0 })}`);

    expect(response.status).toBe(401);
    expect(response.body.error.code).toBe('SESSION_REVOKED');
    expect(findUnique).toHaveBeenCalledWith({
      where: { id: 'user-1' },
      select: { tokenVersion: true, tipoUsuario: true },
    });
  });

  it('acepta un token sin claim v mientras tokenVersion sea 0', async () => {
    const response = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${token()}`);

    expect(response.status).toBe(200);
  });

  it('el login emite un token con la versión actual', async () => {
    findUnique.mockResolvedValue({ ...baseUser, tokenVersion: 3 });

    const response = await request(app)
      .post('/api/auth/login')
      .send({ email: 'usuario@example.com', password: 'password123' });

    expect(response.status).toBe(200);
    expect(jwt.verify(response.body.token, env.jwtSecret).v).toBe(3);
    expect(response.body.user).not.toHaveProperty('tokenVersion');
  });

  it('logout-all incrementa la versión del usuario', async () => {
    const response = await request(app)
      .post('/api/auth/logout-all')
      .set('Authorization', `Bearer ${token({ v: 0 })}`);

    expect(response.status).toBe(200);
    expect(update).toHaveBeenCalledWith({
      where: { id: 'user-1' },
      data: { tokenVersion: { increment: 1 } },
    });
  });

  it('logout-all responde 401 sin token', async () => {
    const response = await request(app).post('/api/auth/logout-all');

    expect(response.status).toBe(401);
    expect(update).not.toHaveBeenCalled();
  });
});

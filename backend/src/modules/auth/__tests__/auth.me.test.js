import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import { env } from '#infrastructure/config/env.js';

const { findUnique } = vi.hoisted(() => ({ findUnique: vi.fn() }));

vi.mock('#infrastructure/database/prisma.js', () => ({
  prisma: { user: { findUnique, findFirst: vi.fn(), create: vi.fn() } },
}));

const storedUser = {
  id: 'user-1',
  alias: 'usuario',
  email: 'usuario@example.com',
  passwordHash: 'hashed-password',
  totpSecret: 'secret',
  tipoUsuario: 'usuario_registrado',
  estado: 'pendiente_verificacion',
  emailVerificado: false,
  twoFactorOn: false,
  consentimientos: {},
};

const makeToken = (options = { expiresIn: '1h' }, secret = env.jwtSecret) =>
  jwt.sign({ sub: 'user-1', tipo: 'usuario_registrado' }, secret, options);

describe('Auth endpoint — GET /me', () => {
  let app;

  beforeAll(async () => {
    const { createApp } = await import('../../../app.js');
    app = createApp();
  });

  beforeEach(() => {
    vi.clearAllMocks();
    findUnique.mockResolvedValue(storedUser);
  });

  it('devuelve el perfil con un token válido', async () => {
    const response = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${makeToken()}`);

    expect(response.status).toBe(200);
    expect(findUnique).toHaveBeenCalledWith({ where: { id: 'user-1' } });
    expect(response.body.user.email).toBe('usuario@example.com');
    expect(response.body.user).not.toHaveProperty('passwordHash');
    expect(response.body.user).not.toHaveProperty('totpSecret');
  });

  it('responde 401 sin cabecera Authorization', async () => {
    const response = await request(app).get('/api/auth/me');

    expect(response.status).toBe(401);
    expect(response.body.error.code).toBe('UNAUTHORIZED');
    expect(findUnique).not.toHaveBeenCalled();
  });

  it('responde 401 si el esquema no es Bearer', async () => {
    const response = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Basic ${makeToken()}`);

    expect(response.status).toBe(401);
    expect(response.body.error.code).toBe('UNAUTHORIZED');
  });

  it('responde 401 con token malformado', async () => {
    const response = await request(app)
      .get('/api/auth/me')
      .set('Authorization', 'Bearer esto-no-es-un-jwt');

    expect(response.status).toBe(401);
    expect(response.body.error.code).toBe('INVALID_TOKEN');
  });

  it('responde 401 con firma incorrecta', async () => {
    const response = await request(app)
      .get('/api/auth/me')
      .set(
        'Authorization',
        `Bearer ${makeToken({ expiresIn: '1h' }, 'otro-secreto')}`,
      );

    expect(response.status).toBe(401);
    expect(response.body.error.code).toBe('INVALID_TOKEN');
  });

  it('responde 401 TOKEN_EXPIRED con token expirado', async () => {
    const response = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${makeToken({ expiresIn: -10 })}`);

    expect(response.status).toBe(401);
    expect(response.body.error.code).toBe('TOKEN_EXPIRED');
    expect(findUnique).not.toHaveBeenCalled();
  });

  it('responde 401 si el usuario ya no existe', async () => {
    findUnique.mockResolvedValue(null);

    const response = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${makeToken()}`);

    expect(response.status).toBe(401);
    expect(response.body.error.code).toBe('UNAUTHORIZED');
  });
});

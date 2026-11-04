import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import { env } from '#infrastructure/config/env.js';

process.env.RATE_LIMIT_IN_TEST = 'true';

const { findUnique, findFirst, compare, checkDelta, userUpdateMany } = vi.hoisted(() => ({
  findUnique: vi.fn(),
  findFirst: vi.fn(),
  compare: vi.fn(),
  checkDelta: vi.fn(),
  userUpdateMany: vi.fn(),
}));

vi.mock('#infrastructure/database/prisma.js', () => ({
  prisma: {
    user: {
      findUnique,
      findFirst,
      create: vi.fn(),
      update: vi.fn(),
      updateMany: userUpdateMany,
    },
  },
}));

vi.mock('bcrypt', () => ({ default: { compare, hash: vi.fn() } }));
vi.mock('otplib', () => ({
  default: { authenticator: { checkDelta } },
}));
vi.mock('#infrastructure/mail/mailer.js', () => ({ sendMail: vi.fn() }));

const email = 'usuario@example.com';

const baseUser = {
  id: 'user-1',
  alias: 'usuario',
  email,
  passwordHash: 'hashed-password',
  totpSecret: null,
  tipoUsuario: 'usuario_registrado',
  estado: 'activo',
  emailVerificado: true,
  twoFactorOn: false,
  consentimientos: {},
};

const sessionToken = (sub) =>
  jwt.sign({ sub, tipo: 'usuario_registrado' }, env.jwtSecret, {
    expiresIn: '1h',
  });

const twoFactorToken = (jwtid) =>
  jwt.sign({ sub: 'user-1', purpose: '2fa', v: 0 }, env.jwtSecret, {
    expiresIn: '5m',
    jwtid,
  });

describe('Auth — rate limiting', () => {
  let app;

  beforeAll(async () => {
    const { createApp } = await import('../../../app.js');
    app = createApp();
    app.set('trust proxy', true);
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('login: los intentos correctos no consumen el límite', async () => {
    findUnique.mockResolvedValue(baseUser);
    compare.mockResolvedValue(true);

    for (let i = 0; i < 12; i++) {
      const response = await request(app)
        .post('/api/auth/login')
        .send({ email, password: 'password123' });
      expect(response.status).toBe(200);
    }
  });

  it('login: bloquea con 429 tras 10 intentos fallidos', async () => {
    findUnique.mockResolvedValue(null);

    for (let i = 0; i < 10; i++) {
      const response = await request(app)
        .post('/api/auth/login')
        .send({ email, password: 'mala' });
      expect(response.status).toBe(401);
    }

    const blocked = await request(app)
      .post('/api/auth/login')
      .send({ email, password: 'mala' });

    expect(blocked.status).toBe(429);
    expect(blocked.body.error.code).toBe('TOO_MANY_REQUESTS');
    expect(blocked.headers['retry-after']).toBeDefined();
    expect(findUnique).toHaveBeenCalledTimes(10);
  });

  it('login: limita una cuenta aunque los intentos vengan de distintas IP', async () => {
    findUnique.mockResolvedValue(null);
    const targetEmail = 'objetivo@example.com';

    for (let attempt = 1; attempt <= 10; attempt++) {
      const response = await request(app)
        .post('/api/auth/login')
        .set('X-Forwarded-For', `198.51.100.${attempt}`)
        .send({ email: targetEmail, password: 'mala' });
      expect(response.status).toBe(401);
    }

    const blocked = await request(app)
      .post('/api/auth/login')
      .set('X-Forwarded-For', '198.51.100.11')
      .send({ email: targetEmail, password: 'mala' });

    expect(blocked.status).toBe(429);
    expect(findUnique).toHaveBeenCalledTimes(10);
  });

  it('register: bloquea con 429 tras 5 peticiones', async () => {
    findFirst.mockResolvedValue({ id: 'x', email, alias: 'otro' });
    const body = {
      alias: 'usuario',
      email,
      password: 'password123',
      consentimientos: {
        terminos: true,
        privacidad: true,
        comunicaciones: false,
      },
    };

    for (let i = 0; i < 5; i++) {
      const response = await request(app).post('/api/auth/register').send(body);
      expect(response.status).toBe(409);
    }

    const blocked = await request(app).post('/api/auth/register').send(body);

    expect(blocked.status).toBe(429);
    expect(blocked.body.error.code).toBe('TOO_MANY_REQUESTS');
    expect(findFirst).toHaveBeenCalledTimes(5);
  });

  it('register: limita el email incluso desde distintas IP', async () => {
    findFirst.mockResolvedValue({
      id: 'x',
      email: 'objetivo@example.com',
      alias: 'otro',
    });
    const body = {
      alias: 'usuario',
      email: 'objetivo@example.com',
      password: 'password123',
      consentimientos: {
        terminos: true,
        privacidad: true,
        comunicaciones: false,
      },
    };

    for (let attempt = 1; attempt <= 5; attempt++) {
      const response = await request(app)
        .post('/api/auth/register')
        .set('X-Forwarded-For', `198.51.100.${attempt}`)
        .send(body);
      expect(response.status).toBe(409);
    }

    const blocked = await request(app)
      .post('/api/auth/register')
      .set('X-Forwarded-For', '198.51.100.6')
      .send(body);

    expect(blocked.status).toBe(429);
    expect(findFirst).toHaveBeenCalledTimes(5);
  });

  it('resend-verification: bloquea con 429 tras 5 peticiones', async () => {
    findUnique.mockResolvedValue(null);

    for (let i = 0; i < 5; i++) {
      const response = await request(app)
        .post('/api/auth/resend-verification')
        .send({ email });
      expect(response.status).toBe(200);
    }

    const blocked = await request(app)
      .post('/api/auth/resend-verification')
      .send({ email });

    expect(blocked.status).toBe(429);
    expect(blocked.body.error.code).toBe('TOO_MANY_REQUESTS');
  });

  it.each([
    '/api/auth/forgot-password',
    '/api/auth/resend-verification',
  ])('%s: limita el email incluso desde distintas IP', async (path) => {
    findUnique.mockResolvedValue(null);

    for (let attempt = 1; attempt <= 5; attempt++) {
      const response = await request(app)
        .post(path)
        .set('X-Forwarded-For', `198.51.100.${attempt}`)
        .send({ email: 'bombing-target@example.com' });
      expect(response.status).toBe(200);
    }

    const blocked = await request(app)
      .post(path)
      .set('X-Forwarded-For', '198.51.100.6')
      .send({ email: 'bombing-target@example.com' });

    expect(blocked.status).toBe(429);
    expect(blocked.body.error.code).toBe('TOO_MANY_REQUESTS');
  });

  it('2fa/login: el límite de intentos se comparte entre tokens del mismo usuario', async () => {
    findUnique.mockResolvedValue({
      ...baseUser,
      totpSecret: 'SECRET123',
      twoFactorOn: true,
    });
    checkDelta.mockReturnValue(null);

    const tokenA = twoFactorToken('a');

    for (let i = 0; i < 5; i++) {
      const response = await request(app)
        .post('/api/auth/2fa/login')
        .send({ twoFactorToken: tokenA, code: '000000' });
      expect(response.status).toBe(401);
      expect(response.body.error.code).toBe('INVALID_TWO_FACTOR_CODE');
    }

    const blocked = await request(app)
      .post('/api/auth/2fa/login')
      .send({ twoFactorToken: tokenA, code: '000000' });

    expect(blocked.status).toBe(429);
    expect(blocked.body.error.code).toBe('TOO_MANY_REQUESTS');
    expect(checkDelta).toHaveBeenCalledTimes(5);

    const rotatedToken = await request(app)
      .post('/api/auth/2fa/login')
      .send({ twoFactorToken: twoFactorToken('b'), code: '000000' });

    expect(rotatedToken.status).toBe(429);
    expect(rotatedToken.body.error.code).toBe('TOO_MANY_REQUESTS');
  });

  it('2fa/login: tokens sin firma válida caen al límite por IP', async () => {
    const forgedToken = jwt.sign(
      { sub: 'user-1', purpose: '2fa', v: 0 },
      'not-the-server-secret',
      { expiresIn: '5m' },
    );

    for (let attempt = 0; attempt < 5; attempt++) {
      const response = await request(app)
        .post('/api/auth/2fa/login')
        .set('X-Forwarded-For', '198.51.100.91')
        .send({ twoFactorToken: forgedToken, code: '000000' });
      expect(response.status).toBe(401);
    }

    const blocked = await request(app)
      .post('/api/auth/2fa/login')
      .set('X-Forwarded-For', '198.51.100.91')
      .send({ twoFactorToken: forgedToken, code: '000000' });

    expect(blocked.status).toBe(429);
    expect(findUnique).not.toHaveBeenCalled();
  });

  it('2fa/enable: el límite es por usuario', async () => {
    findUnique.mockResolvedValue({ ...baseUser, totpSecret: 'SECRET123' });
    checkDelta.mockReturnValue(null);

    const send = (sub) =>
      request(app)
        .post('/api/auth/2fa/enable')
        .set('Authorization', `Bearer ${sessionToken(sub)}`)
        .send({ code: '000000' });

    for (let i = 0; i < 5; i++) {
      const response = await send('user-1');
      expect(response.status).toBe(400);
    }

    const blocked = await send('user-1');
    expect(blocked.status).toBe(429);
    expect(blocked.body.error.code).toBe('TOO_MANY_REQUESTS');

    const otherUser = await send('user-2');
    expect(otherUser.status).toBe(400);
  });
});

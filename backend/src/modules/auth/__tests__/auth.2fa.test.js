import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import { env } from '#infrastructure/config/env.js';

const {
  findUnique,
  update,
  compare,
  generateSecret,
  keyuri,
  check,
  toDataURL,
  transaction,
  deleteMany,
  createMany,
  updateMany,
} = vi.hoisted(() => ({
  findUnique: vi.fn(),
  update: vi.fn(),
  compare: vi.fn(),
  generateSecret: vi.fn(),
  keyuri: vi.fn(),
  check: vi.fn(),
  toDataURL: vi.fn(),
  transaction: vi.fn(),
  deleteMany: vi.fn(),
  createMany: vi.fn(),
  updateMany: vi.fn(),
}));

vi.mock('#infrastructure/database/prisma.js', () => ({
  prisma: {
    user: { findUnique, update, findFirst: vi.fn(), create: vi.fn() },
    recoveryCode: { deleteMany, createMany, updateMany, count: vi.fn() },
    $transaction: transaction,
  },
}));

vi.mock('bcrypt', () => ({ default: { compare, hash: vi.fn() } }));

vi.mock('otplib', () => ({
  default: { authenticator: { generateSecret, keyuri, check } },
}));

vi.mock('qrcode', () => ({ default: { toDataURL } }));

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
  consentimientos: {},
};

const withTwoFactor = {
  ...baseUser,
  totpSecret: 'SECRET123',
  twoFactorOn: true,
};

const sessionToken = () =>
  jwt.sign(
    { sub: 'user-1', tipo: 'usuario_registrado' },
    env.jwtSecret,
    { expiresIn: '1h' },
  );

const twoFactorToken = (options = { expiresIn: '5m' }) =>
  jwt.sign({ sub: 'user-1', purpose: '2fa' }, env.jwtSecret, options);

let app;

beforeAll(async () => {
  const { createApp } = await import('../../../app.js');
  app = createApp();
});

beforeEach(() => {
  vi.clearAllMocks();
  findUnique.mockResolvedValue(baseUser);
  check.mockReturnValue(true);
  compare.mockResolvedValue(true);
  deleteMany.mockResolvedValue({ count: 0 });
  createMany.mockResolvedValue({ count: 10 });
  updateMany.mockResolvedValue({ count: 0 });
  transaction.mockImplementation((ops) => Promise.all(ops));
});

describe('Auth endpoint — 2FA setup', () => {
  it('genera el secreto, lo guarda y devuelve el QR', async () => {
    generateSecret.mockReturnValue('SECRET123');
    keyuri.mockReturnValue(
      'otpauth://totp/Plataforma:usuario@example.com?secret=SECRET123',
    );
    toDataURL.mockResolvedValue('data:image/png;base64,AAA');

    const response = await request(app)
      .post('/api/auth/2fa/setup')
      .set('Authorization', `Bearer ${sessionToken()}`);

    expect(response.status).toBe(200);
    expect(update).toHaveBeenCalledWith({
      where: { id: 'user-1' },
      data: { totpSecret: expect.stringMatching(/^v1:/) },
    });
    expect(update.mock.calls[0][0].data.totpSecret).not.toContain('SECRET123');
    expect(keyuri).toHaveBeenCalledWith(
      'usuario@example.com',
      'Plataforma',
      'SECRET123',
    );
    expect(response.body).toEqual({
      secret: 'SECRET123',
      otpauthUrl:
        'otpauth://totp/Plataforma:usuario@example.com?secret=SECRET123',
      qrCode: 'data:image/png;base64,AAA',
    });
  });

  it('responde 401 sin token', async () => {
    const response = await request(app).post('/api/auth/2fa/setup');

    expect(response.status).toBe(401);
    expect(update).not.toHaveBeenCalled();
  });

  it('responde 409 si el 2FA ya está activado', async () => {
    findUnique.mockResolvedValue(withTwoFactor);

    const response = await request(app)
      .post('/api/auth/2fa/setup')
      .set('Authorization', `Bearer ${sessionToken()}`);

    expect(response.status).toBe(409);
    expect(response.body.error.code).toBe('TWO_FACTOR_ALREADY_ENABLED');
    expect(update).not.toHaveBeenCalled();
  });
});

describe('Auth endpoint — 2FA enable', () => {
  it('activa el 2FA con un código válido', async () => {
    findUnique.mockResolvedValue({ ...baseUser, totpSecret: 'SECRET123' });
    update.mockResolvedValue({
      ...baseUser,
      totpSecret: 'SECRET123',
      twoFactorOn: true,
    });

    const response = await request(app)
      .post('/api/auth/2fa/enable')
      .set('Authorization', `Bearer ${sessionToken()}`)
      .send({ code: '123456' });

    expect(response.status).toBe(200);
    expect(check).toHaveBeenCalledWith('123456', 'SECRET123');
    expect(transaction).toHaveBeenCalledWith([
      expect.anything(),
      expect.anything(),
      expect.anything(),
    ]);
    expect(update).toHaveBeenCalledWith({
      where: { id: 'user-1' },
      data: { twoFactorOn: true },
    });
    expect(response.body.recoveryCodes).toHaveLength(10);
    expect(response.body.user.twoFactorOn).toBe(true);
    expect(response.body.user).not.toHaveProperty('totpSecret');
  });

  it('responde 400 si no se ha iniciado el setup', async () => {
    const response = await request(app)
      .post('/api/auth/2fa/enable')
      .set('Authorization', `Bearer ${sessionToken()}`)
      .send({ code: '123456' });

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('TWO_FACTOR_NOT_SETUP');
    expect(update).not.toHaveBeenCalled();
  });

  it('responde 400 con código incorrecto', async () => {
    findUnique.mockResolvedValue({ ...baseUser, totpSecret: 'SECRET123' });
    check.mockReturnValue(false);

    const response = await request(app)
      .post('/api/auth/2fa/enable')
      .set('Authorization', `Bearer ${sessionToken()}`)
      .send({ code: '000000' });

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('INVALID_TWO_FACTOR_CODE');
    expect(update).not.toHaveBeenCalled();
  });

  it('responde 400 si el código no tiene 6 dígitos', async () => {
    const response = await request(app)
      .post('/api/auth/2fa/enable')
      .set('Authorization', `Bearer ${sessionToken()}`)
      .send({ code: 'abc' });

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('VALIDATION_ERROR');
    expect(findUnique).not.toHaveBeenCalled();
  });

  it('descifra el secreto guardado antes de comprobar el código', async () => {
    const { encryptSecret } = await import('#shared/crypto/secret-box.js');
    findUnique.mockResolvedValue({
      ...baseUser,
      totpSecret: encryptSecret('SECRET123'),
    });
    update.mockResolvedValue({ ...baseUser, twoFactorOn: true });

    const response = await request(app)
      .post('/api/auth/2fa/enable')
      .set('Authorization', `Bearer ${sessionToken()}`)
      .send({ code: '123456' });

    expect(response.status).toBe(200);
    expect(check).toHaveBeenCalledWith('123456', 'SECRET123');
  });
});

describe('Auth endpoint — 2FA disable', () => {
  it('desactiva el 2FA con contraseña y código válidos', async () => {
    findUnique.mockResolvedValue(withTwoFactor);
    update.mockResolvedValue({
      ...baseUser,
      twoFactorOn: false,
      totpSecret: null,
    });

    const response = await request(app)
      .post('/api/auth/2fa/disable')
      .set('Authorization', `Bearer ${sessionToken()}`)
      .send({ password: 'password123', code: '123456' });

    expect(response.status).toBe(200);
    expect(compare).toHaveBeenCalledWith('password123', 'hashed-password');
    expect(transaction).toHaveBeenCalledTimes(1);
    expect(update).toHaveBeenCalledWith({
      where: { id: 'user-1' },
      data: { twoFactorOn: false, totpSecret: null },
    });
    expect(deleteMany).toHaveBeenCalledWith({ where: { userId: 'user-1' } });
    expect(response.body.user.twoFactorOn).toBe(false);
  });

  it('responde 400 con contraseña incorrecta sin comprobar el código', async () => {
    findUnique.mockResolvedValue(withTwoFactor);
    compare.mockResolvedValue(false);

    const response = await request(app)
      .post('/api/auth/2fa/disable')
      .set('Authorization', `Bearer ${sessionToken()}`)
      .send({ password: 'mala', code: '123456' });

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('INVALID_PASSWORD');
    expect(check).not.toHaveBeenCalled();
    expect(update).not.toHaveBeenCalled();
  });

  it('responde 400 si el 2FA no está activado', async () => {
    const response = await request(app)
      .post('/api/auth/2fa/disable')
      .set('Authorization', `Bearer ${sessionToken()}`)
      .send({ password: 'password123', code: '123456' });

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('TWO_FACTOR_NOT_ENABLED');
    expect(update).not.toHaveBeenCalled();
  });
});

describe('Auth endpoint — 2FA login', () => {
  it('devuelve token de sesión y user con un código válido', async () => {
    findUnique.mockResolvedValue(withTwoFactor);

    const response = await request(app)
      .post('/api/auth/2fa/login')
      .send({ twoFactorToken: twoFactorToken(), code: '123456' });

    expect(response.status).toBe(200);
    expect(check).toHaveBeenCalledWith('123456', 'SECRET123');

    const payload = jwt.verify(response.body.token, env.jwtSecret);
    expect(payload.sub).toBe('user-1');
    expect(payload).not.toHaveProperty('purpose');
    expect(response.body.user.email).toBe('usuario@example.com');
    expect(response.body.user).not.toHaveProperty('passwordHash');
    expect(response.body.user).not.toHaveProperty('totpSecret');
  });

  it('responde 401 con código incorrecto', async () => {
    findUnique.mockResolvedValue(withTwoFactor);
    check.mockReturnValue(false);

    const response = await request(app)
      .post('/api/auth/2fa/login')
      .send({ twoFactorToken: twoFactorToken(), code: '000000' });

    expect(response.status).toBe(401);
    expect(response.body.error.code).toBe('INVALID_TWO_FACTOR_CODE');
    expect(response.body).not.toHaveProperty('token');
  });

  it('responde 401 si se presenta un token de sesión normal', async () => {
    const response = await request(app)
      .post('/api/auth/2fa/login')
      .send({ twoFactorToken: sessionToken(), code: '123456' });

    expect(response.status).toBe(401);
    expect(response.body.error.code).toBe('INVALID_TWO_FACTOR_TOKEN');
    expect(findUnique).not.toHaveBeenCalled();
  });

  it('responde 401 con twoFactorToken expirado', async () => {
    const response = await request(app)
      .post('/api/auth/2fa/login')
      .send({
        twoFactorToken: twoFactorToken({ expiresIn: -10 }),
        code: '123456',
      });

    expect(response.status).toBe(401);
    expect(response.body.error.code).toBe('INVALID_TWO_FACTOR_TOKEN');
    expect(check).not.toHaveBeenCalled();
  });

  it('responde 400 si falta el código', async () => {
    const response = await request(app)
      .post('/api/auth/2fa/login')
      .send({ twoFactorToken: twoFactorToken() });

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('VALIDATION_ERROR');
    expect(findUnique).not.toHaveBeenCalled();
  });
});

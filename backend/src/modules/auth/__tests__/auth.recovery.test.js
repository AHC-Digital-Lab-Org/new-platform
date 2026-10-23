import { createHash } from 'node:crypto';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import { env } from '#infrastructure/config/env.js';

const {
  findUnique,
  update,
  compare,
  check,
  transaction,
  deleteMany,
  createMany,
  updateMany,
  count,
} = vi.hoisted(() => ({
  findUnique: vi.fn(),
  update: vi.fn(),
  compare: vi.fn(),
  check: vi.fn(),
  transaction: vi.fn(),
  deleteMany: vi.fn(),
  createMany: vi.fn(),
  updateMany: vi.fn(),
  count: vi.fn(),
}));

vi.mock('#infrastructure/database/prisma.js', () => ({
  prisma: {
    user: { findUnique, update, findFirst: vi.fn(), create: vi.fn() },
    recoveryCode: { deleteMany, createMany, updateMany, count },
    $transaction: transaction,
  },
}));

vi.mock('bcrypt', () => ({ default: { compare, hash: vi.fn() } }));
vi.mock('otplib', () => ({ default: { authenticator: { check } } }));
vi.mock('#infrastructure/mail/mailer.js', () => ({ sendMail: vi.fn() }));

const sha = (value) => createHash('sha256').update(value).digest('hex');

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

const twoFactorToken = () =>
  jwt.sign({ sub: 'user-1', purpose: '2fa' }, env.jwtSecret, {
    expiresIn: '5m',
  });

const CODE_FORMAT = /^[a-z0-9]{4}-[a-z0-9]{4}-[a-z0-9]{4}$/;

let app;

beforeAll(async () => {
  const { createApp } = await import('../../../app.js');
  app = createApp();
});

beforeEach(() => {
  vi.clearAllMocks();
  findUnique.mockResolvedValue(withTwoFactor);
  check.mockReturnValue(true);
  compare.mockResolvedValue(true);
  transaction.mockImplementation((ops) => Promise.all(ops));
});

describe('Auth — recovery codes: generación', () => {
  it('enable devuelve 10 códigos y guarda solo sus hashes', async () => {
    findUnique.mockResolvedValue({ ...baseUser, totpSecret: 'SECRET123' });
    update.mockResolvedValue(withTwoFactor);

    const response = await request(app)
      .post('/api/auth/2fa/enable')
      .set('Authorization', `Bearer ${sessionToken()}`)
      .send({ code: '123456' });

    expect(response.status).toBe(200);

    const { recoveryCodes } = response.body;
    expect(recoveryCodes).toHaveLength(10);
    expect(new Set(recoveryCodes).size).toBe(10);
    for (const code of recoveryCodes) expect(code).toMatch(CODE_FORMAT);

    expect(deleteMany).toHaveBeenCalledWith({ where: { userId: 'user-1' } });

    const { data } = createMany.mock.calls[0][0];
    expect(data).toHaveLength(10);
    expect(data.every((row) => row.userId === 'user-1')).toBe(true);
    expect(data.map((row) => row.codeHash)).toEqual(
      recoveryCodes.map((code) => sha(code.replaceAll('-', ''))),
    );
    expect(JSON.stringify(data)).not.toContain(recoveryCodes[0]);
  });
});

describe('Auth — recovery codes: login', () => {
  it('2fa/login acepta un código de recuperación y avisa de los que quedan', async () => {
    updateMany.mockResolvedValue({ count: 1 });
    count.mockResolvedValue(9);

    const response = await request(app)
      .post('/api/auth/2fa/login')
      .send({ twoFactorToken: twoFactorToken(), code: 'abcd-efgh-jkmn' });

    expect(response.status).toBe(200);
    expect(check).not.toHaveBeenCalled();
    expect(updateMany).toHaveBeenCalledWith({
      where: { userId: 'user-1', codeHash: sha('abcdefghjkmn'), usedAt: null },
      data: { usedAt: expect.any(Date) },
    });
    expect(count).toHaveBeenCalledWith({
      where: { userId: 'user-1', usedAt: null },
    });
    expect(response.body.token).toEqual(expect.any(String));
    expect(response.body.recoveryCodesRemaining).toBe(9);
    expect(response.body.user).not.toHaveProperty('totpSecret');
  });

  it('2fa/login ignora mayúsculas, espacios y guiones al teclear el código', async () => {
    updateMany.mockResolvedValue({ count: 1 });
    count.mockResolvedValue(8);

    const response = await request(app)
      .post('/api/auth/2fa/login')
      .send({ twoFactorToken: twoFactorToken(), code: 'ABCD EFGH-jkmn' });

    expect(response.status).toBe(200);
    expect(updateMany.mock.calls[0][0].where.codeHash).toBe(sha('abcdefghjkmn'));
  });

  it('2fa/login responde 401 si el código ya se usó o no existe', async () => {
    updateMany.mockResolvedValue({ count: 0 });

    const response = await request(app)
      .post('/api/auth/2fa/login')
      .send({ twoFactorToken: twoFactorToken(), code: 'abcd-efgh-jkmn' });

    expect(response.status).toBe(401);
    expect(response.body.error.code).toBe('INVALID_TWO_FACTOR_CODE');
    expect(response.body).not.toHaveProperty('token');
    expect(count).not.toHaveBeenCalled();
  });

  it('2fa/login con código TOTP no toca los códigos de recuperación', async () => {
    const response = await request(app)
      .post('/api/auth/2fa/login')
      .send({ twoFactorToken: twoFactorToken(), code: '123456' });

    expect(response.status).toBe(200);
    expect(check).toHaveBeenCalledWith('123456', 'SECRET123');
    expect(updateMany).not.toHaveBeenCalled();
    expect(response.body).not.toHaveProperty('recoveryCodesRemaining');
  });
});

describe('Auth — recovery codes: regeneración', () => {
  it('genera 10 códigos nuevos y sustituye los anteriores', async () => {
    const response = await request(app)
      .post('/api/auth/2fa/recovery-codes')
      .set('Authorization', `Bearer ${sessionToken()}`)
      .send({ password: 'password123', code: '123456' });

    expect(response.status).toBe(200);
    expect(response.body.recoveryCodes).toHaveLength(10);
    for (const code of response.body.recoveryCodes) expect(code).toMatch(CODE_FORMAT);
    expect(compare).toHaveBeenCalledWith('password123', 'hashed-password');
    expect(transaction).toHaveBeenCalledTimes(1);
    expect(deleteMany).toHaveBeenCalledWith({ where: { userId: 'user-1' } });
    expect(createMany.mock.calls[0][0].data).toHaveLength(10);
    expect(update).not.toHaveBeenCalled();
  });

  it('responde 400 con contraseña incorrecta', async () => {
    compare.mockResolvedValue(false);

    const response = await request(app)
      .post('/api/auth/2fa/recovery-codes')
      .set('Authorization', `Bearer ${sessionToken()}`)
      .send({ password: 'mala', code: '123456' });

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('INVALID_PASSWORD');
    expect(createMany).not.toHaveBeenCalled();
  });

  it('responde 400 si el 2FA no está activado', async () => {
    findUnique.mockResolvedValue(baseUser);

    const response = await request(app)
      .post('/api/auth/2fa/recovery-codes')
      .set('Authorization', `Bearer ${sessionToken()}`)
      .send({ password: 'password123', code: '123456' });

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('TWO_FACTOR_NOT_ENABLED');
    expect(createMany).not.toHaveBeenCalled();
  });

  it('responde 401 sin token', async () => {
    const response = await request(app)
      .post('/api/auth/2fa/recovery-codes')
      .send({ password: 'password123', code: '123456' });

    expect(response.status).toBe(401);
    expect(createMany).not.toHaveBeenCalled();
  });
});

describe('Auth — recovery codes: desactivar 2FA', () => {
  it('disable acepta un código de recuperación y borra los códigos', async () => {
    updateMany.mockResolvedValue({ count: 1 });
    update.mockResolvedValue({ ...baseUser, twoFactorOn: false });

    const response = await request(app)
      .post('/api/auth/2fa/disable')
      .set('Authorization', `Bearer ${sessionToken()}`)
      .send({ password: 'password123', code: 'abcd-efgh-jkmn' });

    expect(response.status).toBe(200);
    expect(check).not.toHaveBeenCalled();
    expect(update).toHaveBeenCalledWith({
      where: { id: 'user-1' },
      data: { twoFactorOn: false, totpSecret: null },
    });
    expect(deleteMany).toHaveBeenCalledWith({ where: { userId: 'user-1' } });
    expect(response.body.user.twoFactorOn).toBe(false);
  });
});

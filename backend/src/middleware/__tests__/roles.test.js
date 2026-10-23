import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import express from 'express';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import { env } from '#infrastructure/config/env.js';
import { authenticate } from '#middleware/auth.middleware.js';
import { errorHandler } from '#middleware/error.middleware.js';
import { requireRole } from '#middleware/roles.middleware.js';
import { ROLES } from '#shared/roles.js';

const { findUnique } = vi.hoisted(() => ({ findUnique: vi.fn() }));

vi.mock('#infrastructure/database/prisma.js', () => ({
  prisma: { user: { findUnique } },
}));

const token = (tipo = ROLES.USER) =>
  jwt.sign({ sub: 'user-1', tipo, v: 0 }, env.jwtSecret, { expiresIn: '1h' });

const run = (middleware, req) => {
  const next = vi.fn();
  let error;
  try {
    middleware(req, {}, next);
  } catch (err) {
    error = err;
  }
  return { next, error };
};

describe('requireRole — middleware', () => {
  it('deja pasar si el rol está permitido', () => {
    const { next, error } = run(requireRole(ROLES.ADMIN), {
      auth: { tipo: ROLES.ADMIN },
    });

    expect(error).toBeUndefined();
    expect(next).toHaveBeenCalledTimes(1);
  });

  it('acepta varios roles', () => {
    const { next } = run(requireRole(ROLES.ADMIN, ROLES.USER), {
      auth: { tipo: ROLES.USER },
    });

    expect(next).toHaveBeenCalledTimes(1);
  });

  it('lanza 403 si el rol no está permitido', () => {
    const { next, error } = run(requireRole(ROLES.ADMIN), {
      auth: { tipo: ROLES.USER },
    });

    expect(error).toMatchObject({ status: 403, code: 'FORBIDDEN' });
    expect(next).not.toHaveBeenCalled();
  });

  it('lanza 401 si no hay req.auth (authenticate no se ejecutó)', () => {
    const { next, error } = run(requireRole(ROLES.ADMIN), {});

    expect(error).toMatchObject({ status: 401, code: 'UNAUTHORIZED' });
    expect(next).not.toHaveBeenCalled();
  });

  it('falla al configurarlo sin roles', () => {
    expect(() => requireRole()).toThrow();
  });
});

describe('requireRole — integrado con authenticate', () => {
  const app = express();

  app.get('/admin-only', authenticate, requireRole(ROLES.ADMIN), (_req, res) =>
    res.json({ ok: true }),
  );
  app.use(errorHandler);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('permite el paso a un administrador', async () => {
    findUnique.mockResolvedValue({ tokenVersion: 0, tipoUsuario: ROLES.ADMIN });

    const response = await request(app)
      .get('/admin-only')
      .set('Authorization', `Bearer ${token()}`);

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ ok: true });
  });

  it('responde 403 a un usuario normal', async () => {
    findUnique.mockResolvedValue({ tokenVersion: 0, tipoUsuario: ROLES.USER });

    const response = await request(app)
      .get('/admin-only')
      .set('Authorization', `Bearer ${token()}`);

    expect(response.status).toBe(403);
    expect(response.body.error.code).toBe('FORBIDDEN');
  });

  it('usa el rol de la BD aunque el token diga admin', async () => {
    findUnique.mockResolvedValue({ tokenVersion: 0, tipoUsuario: ROLES.USER });

    const response = await request(app)
      .get('/admin-only')
      .set('Authorization', `Bearer ${token(ROLES.ADMIN)}`);

    expect(response.status).toBe(403);
  });

  it('responde 401 sin token', async () => {
    const response = await request(app).get('/admin-only');

    expect(response.status).toBe(401);
    expect(response.body.error.code).toBe('UNAUTHORIZED');
    expect(findUnique).not.toHaveBeenCalled();
  });
});

import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import request from 'supertest';

const {
  findFirst,
  findUnique,
  create,
  update,
  hash,
  compare,
  sign,
  sendMail,
} = vi.hoisted(() => ({
  findFirst: vi.fn(),
  findUnique: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  hash: vi.fn(),
  compare: vi.fn(),
  sign: vi.fn(),
  sendMail: vi.fn(),
}));

vi.mock('#infrastructure/database/prisma.js', () => ({
  prisma: { user: { findFirst, findUnique, create, update } },
}));

vi.mock('#infrastructure/mail/mailer.js', () => ({ sendMail }));

vi.mock('bcrypt', () => ({
  default: { hash, compare },
}));

vi.mock('jsonwebtoken', () => ({
  default: { sign },
}));

const { register, login } = await import('../auth.service.js');

describe('Auth service — register', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    findFirst.mockResolvedValue(null);
    hash.mockResolvedValue('hashed-password');
  });

  it('registra usuario correctamente', async () => {
    create.mockResolvedValue({
      id: 'user-1',
      alias: 'usuario',
      email: 'usuario@example.com',
      nombre: 'Usuario',
      ciudad: 'Bogotá',
      pais: 'Colombia',
      passwordHash: 'hashed-password',
      tipoUsuario: 'usuario_registrado',
      estado: 'pendiente_verificacion',
      emailVerificado: false,
      totpSecret: null,
      twoFactorOn: false,
      consentimientos: { terminos: true },
    });
    const user = await register({
      alias: 'usuario',
      email: 'usuario@example.com',
      password: 'password123',
      nombre: 'Usuario',
      ciudad: 'Bogotá',
      pais: 'Colombia',
      consentimientos: { terminos: true },
    });

    expect(findFirst).toHaveBeenCalledWith({
      where: {
        OR: [{ email: 'usuario@example.com' }, { alias: 'usuario' }],
      },
    });
    expect(hash).toHaveBeenCalledWith('password123', 10);
    expect(create).toHaveBeenCalledWith({
      data: {
        alias: 'usuario',
        email: 'usuario@example.com',
        passwordHash: 'hashed-password',
        nombre: 'Usuario',
        ciudad: 'Bogotá',
        pais: 'Colombia',
        consentimientos: { terminos: true },
        tipoUsuario: 'usuario_registrado',
        estado: 'pendiente_verificacion',
      },
    });
    expect(user).not.toHaveProperty('passwordHash');
    expect(user).not.toHaveProperty('totpSecret');
    expect(user.alias).toBe('usuario');
  });

  it('rechaza email duplicado', async () => {
    findFirst.mockResolvedValue({
      id: 'existing-user',
      email: 'usuario@example.com',
      alias: 'otro-alias',
    });

    await expect(
      register({
        alias: 'usuario',
        email: 'usuario@example.com',
        password: 'password123',
        consentimientos: { terminos: true },
      }),
    ).rejects.toMatchObject({
      status: 409,
      code: 'USER_ALREADY_EXISTS',
      message: 'El email ya está en uso',
    });

    expect(hash).not.toHaveBeenCalled();
    expect(create).not.toHaveBeenCalled();
  });

  it('rechaza alias duplicado', async () => {
    findFirst.mockResolvedValue({
      id: 'existing-user',
      email: 'otro@example.com',
      alias: 'usuario',
    });

    await expect(
      register({
        alias: 'usuario',
        email: 'usuario@example.com',
        password: 'password123',
        consentimientos: { terminos: true },
      }),
    ).rejects.toMatchObject({
      status: 409,
      code: 'USER_ALREADY_EXISTS',
      message: 'El alias ya está en uso',
    });

    expect(hash).not.toHaveBeenCalled();
    expect(create).not.toHaveBeenCalled();
  });

  it('nunca devuelve passwordHash ni totpSecret', async () => {
    create.mockResolvedValue({
      id: 'user-1',
      alias: 'usuario',
      email: 'usuario@example.com',
      passwordHash: 'hashed-password',
      totpSecret: 'secret',
      consentimientos: {},
    });
    const user = await register({
      alias: 'usuario',
      email: 'usuario@example.com',
      password: 'password123',
      consentimientos: {},
    });

    expect(user).not.toHaveProperty('passwordHash');
    expect(user).not.toHaveProperty('totpSecret');
  });

  it('guarda solo el hash del token y envía el correo de verificación', async () => {
    create.mockResolvedValue({
      id: 'user-1',
      alias: 'usuario',
      email: 'usuario@example.com',
      consentimientos: {},
    });

    await register({
      alias: 'usuario',
      email: 'usuario@example.com',
      password: 'password123',
      consentimientos: {},
    });

    const { where, data } = update.mock.calls[0][0];
    expect(where).toEqual({ id: 'user-1' });
    expect(data.emailVerificationTokenHash).toMatch(/^[a-f0-9]{64}$/);
    expect(data.emailVerificationExpires).toBeInstanceOf(Date);

    const mail = sendMail.mock.calls[0][0];
    expect(mail.to).toBe('usuario@example.com');
    expect(mail.text).toContain('verify-email?token=');
    expect(mail.text).not.toContain(data.emailVerificationTokenHash);
  });

  it('no falla el registro si el correo no se puede enviar', async () => {
    create.mockResolvedValue({
      id: 'user-1',
      alias: 'usuario',
      email: 'usuario@example.com',
      consentimientos: {},
    });
    sendMail.mockRejectedValueOnce(new Error('SMTP caído'));

    await expect(
      register({
        alias: 'usuario',
        email: 'usuario@example.com',
        password: 'password123',
        consentimientos: {},
      }),
    ).resolves.toHaveProperty('id', 'user-1');
  });
});

describe('Auth endpoint — register', () => {
  let app;

  beforeAll(async () => {
    const { createApp } = await import('../../../app.js');
    app = createApp();
  });

  beforeEach(() => {
    vi.clearAllMocks();
    findFirst.mockResolvedValue(null);
    hash.mockResolvedValue('hashed-password');
  });

  it('registra usuario correctamente y responde 201', async () => {
    create.mockResolvedValue({
      id: 'user-1',
      alias: 'usuario',
      email: 'usuario@example.com',
      nombre: 'Usuario',
      ciudad: 'Bogotá',
      pais: 'Colombia',
      passwordHash: 'hashed-password',
      tipoUsuario: 'usuario_registrado',
      estado: 'pendiente_verificacion',
      emailVerificado: false,
      totpSecret: null,
      twoFactorOn: false,
      consentimientos: { terminos: true },
    });
    const response = await request(app)
      .post('/api/auth/register')
      .send({
        alias: 'usuario',
        email: 'usuario@example.com',
        password: 'password123',
        nombre: 'Usuario',
        ciudad: 'Bogotá',
        pais: 'Colombia',
        consentimientos: { terminos: true },
      });

    expect(response.status).toBe(201);
    expect(response.body.user).toEqual({
      id: 'user-1',
      alias: 'usuario',
      email: 'usuario@example.com',
      nombre: 'Usuario',
      ciudad: 'Bogotá',
      pais: 'Colombia',
      tipoUsuario: 'usuario_registrado',
      estado: 'pendiente_verificacion',
      emailVerificado: false,
      twoFactorOn: false,
      consentimientos: { terminos: true },
    });
    expect(response.body.user).not.toHaveProperty('passwordHash');
    expect(response.body.user).not.toHaveProperty('totpSecret');
    expect(findFirst).toHaveBeenCalledWith({
      where: {
        OR: [{ email: 'usuario@example.com' }, { alias: 'usuario' }],
      },
    });
    expect(hash).toHaveBeenCalledWith('password123', 10);
    expect(create).toHaveBeenCalled();
  });

  it('rechaza datos inválidos con 400', async () => {
    const response = await request(app)
      .post('/api/auth/register')
      .send({
        alias: 'ab',
        email: 'email-invalido',
        password: '123',
        consentimientos: {},
      });

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('VALIDATION_ERROR');
    expect(response.body.error.details).toBeDefined();
    expect(findFirst).not.toHaveBeenCalled();
    expect(hash).not.toHaveBeenCalled();
    expect(create).not.toHaveBeenCalled();
  });

  it('rechaza email duplicado con 409', async () => {
    findFirst.mockResolvedValue({
      id: 'existing-user',
      email: 'usuario@example.com',
      alias: 'otro-alias',
    });
    const response = await request(app)
      .post('/api/auth/register')
      .send({
        alias: 'usuario',
        email: 'usuario@example.com',
        password: 'password123',
        consentimientos: {},
      });

    expect(response.status).toBe(409);
    expect(response.body.error.code).toBe('USER_ALREADY_EXISTS');
    expect(response.body.error.message).toBe('El email ya está en uso');
    expect(hash).not.toHaveBeenCalled();
    expect(create).not.toHaveBeenCalled();
  });
});

const storedUser = {
  id: 'user-1',
  alias: 'usuario',
  email: 'usuario@example.com',
  passwordHash: 'hashed-password',
  totpSecret: 'secret',
  tipoUsuario: 'usuario_registrado',
  estado: 'activo',
  emailVerificado: true,
  twoFactorOn: false,
  consentimientos: {},
};

describe('Auth service — login', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    findUnique.mockResolvedValue(storedUser);
    compare.mockResolvedValue(true);
    sign.mockReturnValue('jwt-token');
  });

  it('devuelve token y usuario sin datos sensibles', async () => {
    const result = await login({
      email: 'usuario@example.com',
      password: 'password123',
    });

    expect(findUnique).toHaveBeenCalledWith({
      where: { email: 'usuario@example.com' },
    });
    expect(compare).toHaveBeenCalledWith('password123', 'hashed-password');
    expect(sign).toHaveBeenCalledWith(
      { sub: 'user-1', tipo: 'usuario_registrado' },
      expect.any(String),
      expect.objectContaining({ expiresIn: expect.anything() }),
    );
    expect(result.token).toBe('jwt-token');
    expect(result.user).not.toHaveProperty('passwordHash');
    expect(result.user).not.toHaveProperty('totpSecret');
  });

  it('rechaza si el usuario no existe', async () => {
    findUnique.mockResolvedValue(null);

    await expect(
      login({ email: 'nadie@example.com', password: 'password123' }),
    ).rejects.toMatchObject({ status: 401, code: 'INVALID_CREDENTIALS' });

    expect(compare).not.toHaveBeenCalled();
    expect(sign).not.toHaveBeenCalled();
  });

  it('rechaza si el usuario no tiene contraseña', async () => {
    findUnique.mockResolvedValue({ ...storedUser, passwordHash: null });

    await expect(
      login({ email: 'usuario@example.com', password: 'password123' }),
    ).rejects.toMatchObject({ status: 401, code: 'INVALID_CREDENTIALS' });

    expect(sign).not.toHaveBeenCalled();
  });

  it('rechaza contraseña incorrecta con el mismo error', async () => {
    compare.mockResolvedValue(false);

    await expect(
      login({ email: 'usuario@example.com', password: 'mala' }),
    ).rejects.toMatchObject({
      status: 401,
      code: 'INVALID_CREDENTIALS',
      message: 'Email o contraseña incorrectos',
    });

    expect(sign).not.toHaveBeenCalled();
  });

  it('rechaza si el email no está verificado', async () => {
    findUnique.mockResolvedValue({ ...storedUser, emailVerificado: false });

    await expect(
      login({ email: 'usuario@example.com', password: 'password123' }),
    ).rejects.toMatchObject({ status: 403, code: 'EMAIL_NOT_VERIFIED' });

    expect(sign).not.toHaveBeenCalled();
  });

  it('pide el segundo factor si el usuario tiene 2FA activado', async () => {
    findUnique.mockResolvedValue({ ...storedUser, twoFactorOn: true });

    const result = await login({
      email: 'usuario@example.com',
      password: 'password123',
    });

    expect(sign).toHaveBeenCalledWith(
      { sub: 'user-1', purpose: '2fa' },
      expect.any(String),
      { expiresIn: '5m' },
    );
    expect(result).toEqual({
      twoFactorRequired: true,
      twoFactorToken: 'jwt-token',
    });
    expect(result).not.toHaveProperty('token');
    expect(result).not.toHaveProperty('user');
  });
});

describe('Auth endpoint — login', () => {
  let app;

  beforeAll(async () => {
    const { createApp } = await import('../../../app.js');
    app = createApp();
  });

  beforeEach(() => {
    vi.clearAllMocks();
    findUnique.mockResolvedValue(storedUser);
    compare.mockResolvedValue(true);
    sign.mockReturnValue('jwt-token');
  });

  it('responde 200 con token y user', async () => {
    const response = await request(app)
      .post('/api/auth/login')
      .send({ email: 'usuario@example.com', password: 'password123' });

    expect(response.status).toBe(200);
    expect(response.body.token).toBe('jwt-token');
    expect(response.body.user.email).toBe('usuario@example.com');
    expect(response.body.user).not.toHaveProperty('passwordHash');
    expect(response.body.user).not.toHaveProperty('totpSecret');
  });

  it('responde 401 con credenciales incorrectas', async () => {
    compare.mockResolvedValue(false);

    const response = await request(app)
      .post('/api/auth/login')
      .send({ email: 'usuario@example.com', password: 'mala' });

    expect(response.status).toBe(401);
    expect(response.body.error.code).toBe('INVALID_CREDENTIALS');
  });

  it('responde 400 con datos inválidos', async () => {
    const response = await request(app)
      .post('/api/auth/login')
      .send({ email: 'no-es-email' });

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('VALIDATION_ERROR');
    expect(findUnique).not.toHaveBeenCalled();
  });
});

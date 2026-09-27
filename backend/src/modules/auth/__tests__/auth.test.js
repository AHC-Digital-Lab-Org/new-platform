import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import request from 'supertest';
const { findFirst, create, hash } = vi.hoisted(() => ({
findFirst: vi.fn(),
create: vi.fn(),
hash: vi.fn(),
}));
vi.mock('#infrastructure/database/prisma.js', () => ({
prisma: {
user: {
findFirst,
create,
},
},
}));
vi.mock('bcrypt', () => ({
default: {
hash,
},
}));
const { register } = await import('../auth.service.js');
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
    OR: [
      { email: 'usuario@example.com' },
      { alias: 'usuario' },
    ],
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
    consentimientos: {},
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
    OR: [
      { email: 'usuario@example.com' },
      { alias: 'usuario' },
    ],
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
describe('Auth module — login', () => {
it.todo('login: se implementa en Commit 4');
});
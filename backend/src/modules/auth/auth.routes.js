import { Router } from 'express';
import { validate } from '#middleware/validate.middleware.js';
import { authenticate } from '#middleware/auth.middleware.js';
import * as authController from './auth.controller.js';
import {
  registerSchema,
  loginSchema,
  verifyEmailSchema,
  resendVerificationSchema,
} from './auth.schema.js';

export const router = Router();

/**
 * @openapi
 * /api/auth/register:
 *   post:
 *     tags:
 *       - Auth
 *     summary: Registrar un nuevo usuario
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - alias
 *               - email
 *               - password
 *               - consentimientos
 *             properties:
 *               alias:
 *                 type: string
 *               email:
 *                 type: string
 *                 format: email
 *               password:
 *                 type: string
 *                 minLength: 8
 *               nombre:
 *                 type: string
 *               ciudad:
 *                 type: string
 *               pais:
 *                 type: string
 *               consentimientos:
 *                 type: object
 *     responses:
 *       201:
 *         description: Usuario creado
 *       409:
 *         description: Email o alias ya en uso
 *       400:
 *         description: Datos inválidos
 */
router.post('/register', validate({ body: registerSchema }), authController.register);


/**
 * @openapi
 * /api/auth/login:
 *   post:
 *     tags:
 *       - Auth
 *     summary: Iniciar sesión
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *               password:
 *                 type: string
 *     responses:
 *       200:
 *         description: Login correcto. Devuelve `token` (JWT) y `user`
 *       401:
 *         description: Credenciales incorrectas
 *       403:
 *         description: Email sin verificar (`EMAIL_NOT_VERIFIED`)
 *       400:
 *         description: Datos inválidos
 */
router.post('/login', validate({ body: loginSchema }), authController.login);

/**
 * @openapi
 * /api/auth/me:
 *   get:
 *     tags:
 *       - Auth
 *     summary: Perfil del usuario autenticado
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Devuelve `user` (sin datos sensibles)
 *       401:
 *         description: Token ausente, inválido o expirado
 */
router.get('/me', authenticate, authController.me);

/**
 * @openapi
 * /api/auth/verify-email:
 *   post:
 *     tags:
 *       - Auth
 *     summary: Verificar el email con el token recibido por correo
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - token
 *             properties:
 *               token:
 *                 type: string
 *     responses:
 *       200:
 *         description: Email verificado. Devuelve `user`
 *       400:
 *         description: Token inválido o expirado
 */
router.post(
  '/verify-email',
  validate({ body: verifyEmailSchema }),
  authController.verifyEmail,
);

/**
 * @openapi
 * /api/auth/resend-verification:
 *   post:
 *     tags:
 *       - Auth
 *     summary: Reenviar el correo de verificación
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *     responses:
 *       200:
 *         description: Respuesta genérica (no revela si el email existe)
 *       400:
 *         description: Datos inválidos
 */
router.post(
  '/resend-verification',
  validate({ body: resendVerificationSchema }),
  authController.resendVerification,
);
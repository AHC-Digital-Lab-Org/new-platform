import { Router } from 'express';
import { validate } from '#middleware/validate.middleware.js';
import { authenticate } from '#middleware/auth.middleware.js';
import {
  registerLimiter,
  loginLimiter,
  resendVerificationLimiter,
  twoFactorLoginIpLimiter,
  twoFactorLoginTokenLimiter,
  twoFactorManageLimiter,
} from '#middleware/rate-limit.middleware.js';
import * as authController from './auth.controller.js';
import {
  registerSchema,
  loginSchema,
  verifyEmailSchema,
  resendVerificationSchema,
  twoFactorCodeSchema,
  twoFactorLoginSchema,
  twoFactorDisableSchema,
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
 *       429:
 *         description: Demasiados intentos (`TOO_MANY_REQUESTS`). Mira la cabecera `Retry-After`
 */
router.post(
  '/register',
  registerLimiter,
  validate({ body: registerSchema }),
  authController.register,
);


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
 *         description: Login correcto. Devuelve `token` y `user`; si el usuario tiene 2FA, devuelve `twoFactorRequired` y `twoFactorToken` (usar en `/api/auth/2fa/login`)
 *       401:
 *         description: Credenciales incorrectas
 *       403:
 *         description: Email sin verificar (`EMAIL_NOT_VERIFIED`)
 *       400:
 *         description: Datos inválidos
 *       429:
 *         description: Demasiados intentos (`TOO_MANY_REQUESTS`). Mira la cabecera `Retry-After`
 */
router.post(
  '/login',
  loginLimiter,
  validate({ body: loginSchema }),
  authController.login,
);

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
 *       429:
 *         description: Demasiados intentos (`TOO_MANY_REQUESTS`). Mira la cabecera `Retry-After`
 */
router.post(
  '/resend-verification',
  resendVerificationLimiter,
  validate({ body: resendVerificationSchema }),
  authController.resendVerification,
);

/**
 * @openapi
 * /api/auth/2fa/setup:
 *   post:
 *     tags:
 *       - Auth
 *     summary: Inicia la configuración del 2FA (devuelve secreto y QR)
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Devuelve `secret`, `otpauthUrl` y `qrCode` (data URL). El 2FA aún no está activo
 *       401:
 *         description: Token ausente, inválido o expirado
 *       409:
 *         description: El 2FA ya está activado
 */
router.post('/2fa/setup', authenticate, authController.twoFactorSetup);

/**
 * @openapi
 * /api/auth/2fa/enable:
 *   post:
 *     tags:
 *       - Auth
 *     summary: Activa el 2FA confirmando un código de la app autenticadora
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - code
 *             properties:
 *               code:
 *                 type: string
 *                 example: "123456"
 *     responses:
 *       200:
 *         description: 2FA activado. Devuelve `user`
 *       400:
 *         description: Código incorrecto, datos inválidos o setup sin iniciar
 *       401:
 *         description: Token ausente, inválido o expirado
 *       409:
 *         description: El 2FA ya está activado
 *       429:
 *         description: Demasiados intentos (`TOO_MANY_REQUESTS`). Mira la cabecera `Retry-After`
 */
router.post(
  '/2fa/enable',
  authenticate,
  twoFactorManageLimiter,
  validate({ body: twoFactorCodeSchema }),
  authController.twoFactorEnable,
);

/**
 * @openapi
 * /api/auth/2fa/disable:
 *   post:
 *     tags:
 *       - Auth
 *     summary: Desactiva el 2FA (requiere contraseña y código)
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - password
 *               - code
 *             properties:
 *               password:
 *                 type: string
 *               code:
 *                 type: string
 *                 example: "123456"
 *     responses:
 *       200:
 *         description: 2FA desactivado. Devuelve `user`
 *       400:
 *         description: Contraseña o código incorrectos, 2FA no activado o datos inválidos
 *       401:
 *         description: Token ausente, inválido o expirado
 *       429:
 *         description: Demasiados intentos (`TOO_MANY_REQUESTS`). Mira la cabecera `Retry-After`
 */
router.post(
  '/2fa/disable',
  authenticate,
  twoFactorManageLimiter,
  validate({ body: twoFactorDisableSchema }),
  authController.twoFactorDisable,
);

/**
 * @openapi
 * /api/auth/2fa/login:
 *   post:
 *     tags:
 *       - Auth
 *     summary: Segundo paso del login con 2FA
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - twoFactorToken
 *               - code
 *             properties:
 *               twoFactorToken:
 *                 type: string
 *               code:
 *                 type: string
 *                 example: "123456"
 *     responses:
 *       200:
 *         description: Login correcto. Devuelve `token` y `user`
 *       400:
 *         description: Datos inválidos
 *       401:
 *         description: Código incorrecto (`INVALID_TWO_FACTOR_CODE`) o twoFactorToken inválido/expirado (`INVALID_TWO_FACTOR_TOKEN`)
 *       429:
 *         description: Demasiados intentos (`TOO_MANY_REQUESTS`). Mira la cabecera `Retry-After`
 */
router.post(
  '/2fa/login',
  validate({ body: twoFactorLoginSchema }),
  twoFactorLoginIpLimiter,
  twoFactorLoginTokenLimiter,
  authController.twoFactorLogin,
);
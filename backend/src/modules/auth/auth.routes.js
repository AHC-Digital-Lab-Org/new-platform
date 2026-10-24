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
  forgotPasswordLimiter,
  resetPasswordLimiter,
  changePasswordLimiter,
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
  twoFactorRegenerateSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  changePasswordSchema,
  citiesQuerySchema,
} from './auth.schema.js';

export const router = Router();

/**
 * @openapi
 * /api/auth/locations/countries:
 *   get:
 *     tags:
 *       - Auth
 *     summary: Lista los países disponibles para el registro
 *     responses:
 *       200:
 *         description: Países con código ISO y nombre localizado
 */
router.get('/locations/countries', authController.locationsCountries);

/**
 * @openapi
 * /api/auth/locations/cities:
 *   get:
 *     tags:
 *       - Auth
 *     summary: Busca ciudades dentro de un país
 *     parameters:
 *       - in: query
 *         name: country
 *         required: true
 *         schema:
 *           type: string
 *           pattern: '^[A-Z]{2}$'
 *       - in: query
 *         name: q
 *         required: true
 *         schema:
 *           type: string
 *           minLength: 1
 *     responses:
 *       200:
 *         description: Hasta 25 coincidencias
 *       400:
 *         description: Parámetros inválidos
 */
router.get(
  '/locations/cities',
  validate({ query: citiesQuerySchema }),
  authController.locationsCities,
);

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
 *         description: 2FA activado. Devuelve `user` y `recoveryCodes` (10 códigos de un solo uso, se muestran solo esta vez)
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
 *                 description: Código TOTP de 6 dígitos o código de recuperación
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
 *                 description: Código TOTP de 6 dígitos o código de recuperación
 *                 example: "123456"
 *     responses:
 *       200:
 *         description: Login correcto. Devuelve `token` y `user`; si se usó un código de recuperación, también `recoveryCodesRemaining`
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

/**
 * @openapi
 * /api/auth/2fa/recovery-codes:
 *   post:
 *     tags:
 *       - Auth
 *     summary: Regenera los códigos de recuperación (invalida los anteriores)
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
 *                 description: Código TOTP de 6 dígitos o código de recuperación
 *                 example: "123456"
 *     responses:
 *       200:
 *         description: Devuelve `recoveryCodes` (10 códigos nuevos, se muestran solo esta vez)
 *       400:
 *         description: Contraseña o código incorrectos, 2FA no activado o datos inválidos
 *       401:
 *         description: Token ausente, inválido o expirado
 *       429:
 *         description: Demasiados intentos (`TOO_MANY_REQUESTS`). Mira la cabecera `Retry-After`
 */
router.post(
  '/2fa/recovery-codes',
  authenticate,
  twoFactorManageLimiter,
  validate({ body: twoFactorRegenerateSchema }),
  authController.twoFactorRecoveryCodes,
);

/**
 * @openapi
 * /api/auth/forgot-password:
 *   post:
 *     tags:
 *       - Auth
 *     summary: Solicitar el enlace para restablecer la contraseña
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
  '/forgot-password',
  forgotPasswordLimiter,
  validate({ body: forgotPasswordSchema }),
  authController.forgotPassword,
);

/**
 * @openapi
 * /api/auth/reset-password:
 *   post:
 *     tags:
 *       - Auth
 *     summary: Establecer una nueva contraseña con el token recibido por correo
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - token
 *               - password
 *             properties:
 *               token:
 *                 type: string
 *               password:
 *                 type: string
 *                 minLength: 8
 *     responses:
 *       200:
 *         description: Contraseña actualizada
 *       400:
 *         description: Token inválido o expirado (`INVALID_RESET_TOKEN`) o datos inválidos
 *       429:
 *         description: Demasiados intentos (`TOO_MANY_REQUESTS`). Mira la cabecera `Retry-After`
 */
router.post(
  '/reset-password',
  resetPasswordLimiter,
  validate({ body: resetPasswordSchema }),
  authController.resetPassword,
);

/**
 * @openapi
 * /api/auth/logout-all:
 *   post:
 *     tags:
 *       - Auth
 *     summary: Cierra todas las sesiones del usuario (incluida la actual)
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Sesiones cerradas. El frontend debe descartar su token
 *       401:
 *         description: Token ausente, inválido, expirado o revocado (`SESSION_REVOKED`)
 */
router.post('/logout-all', authenticate, authController.logoutAll);

/**
 * @openapi
 * /api/auth/change-password:
 *   post:
 *     tags:
 *       - Auth
 *     summary: Cambiar la contraseña (cierra las demás sesiones y devuelve un token nuevo)
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - currentPassword
 *               - newPassword
 *             properties:
 *               currentPassword:
 *                 type: string
 *               newPassword:
 *                 type: string
 *                 minLength: 8
 *     responses:
 *       200:
 *         description: Contraseña cambiada. Devuelve `token` (nuevo, sustituye al anterior) y `user`
 *       400:
 *         description: Contraseña actual incorrecta (`INVALID_PASSWORD`), nueva igual a la actual (`SAME_PASSWORD`) o datos inválidos
 *       401:
 *         description: Token ausente, inválido, expirado o revocado (`SESSION_REVOKED`)
 *       429:
 *         description: Demasiados intentos (`TOO_MANY_REQUESTS`). Mira la cabecera `Retry-After`
 */
router.post(
  '/change-password',
  authenticate,
  changePasswordLimiter,
  validate({ body: changePasswordSchema }),
  authController.changePassword,
);
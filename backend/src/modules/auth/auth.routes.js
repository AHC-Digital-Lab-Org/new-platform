import { Router } from 'express';
import { validate } from '#middleware/validate.middleware.js';
import * as authController from './auth.controller.js';
import { registerSchema, loginSchema } from './auth.schema.js';

export const router = Router();

/**
 * @openapi
 * /api/auth/register:
 *   post:
 *     tags:
 *       - Auth
 *     summary: Registrar un nuevo usuario
 *     responses:
 *       501:
 *         description: Pendiente de implementación (Commit 3)
 */
router.post('/register', validate(registerSchema), authController.register);

/**
 * @openapi
 * /api/auth/login:
 *   post:
 *     tags:
 *       - Auth
 *     summary: Iniciar sesión
 *     responses:
 *       501:
 *         description: Pendiente de implementación (Commit 4)
 */
router.post('/login', validate(loginSchema), authController.login);

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
 *     responses:
 *       501:
 *         description: Pendiente de implementación (Commit 4)
 */
router.post('/login', validate({ body: loginSchema }), authController.login);
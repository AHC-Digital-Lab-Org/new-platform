import { Router } from 'express';
import { validate } from '#middleware/validate.middleware.js';
import * as controller from './chatbot.controller.js';
import { askBody } from './chatbot.schema.js';

export const router = Router();

/**
 * @openapi
 * /chatbot/ask:
 *   post:
 *     tags: [Chatbot]
 *     summary: Pregunta al asistente de la web
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [question]
 *             properties:
 *               question: { type: string, minLength: 1, maxLength: 2000 }
 *               history:
 *                 type: array
 *                 maxItems: 10
 *                 description: Turnos anteriores, del más antiguo al más reciente
 *                 items:
 *                   type: object
 *                   required: [role, text]
 *                   properties:
 *                     role: { type: string, enum: [user, assistant] }
 *                     text: { type: string, minLength: 1, maxLength: 2000 }
 *               locale:
 *                 type: string
 *                 enum: [es, ca, en]
 *                 description: Idioma de la interfaz
 *     responses:
 *       200:
 *         description: Respuesta del asistente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 answer: { type: string }
 *                 sources: { type: array, items: { type: string } }
 *       400:
 *         description: Datos de entrada no válidos
 */
router.post('/ask', validate({ body: askBody }), controller.ask);

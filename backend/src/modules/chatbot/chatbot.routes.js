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
 *               question: { type: string }
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
 */
router.post('/ask', validate({ body: askBody }), controller.ask);

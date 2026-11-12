import { Router } from 'express';
import { chatbotLimiter } from '#middleware/rate-limit.middleware.js';
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
 *       429:
 *         description: Demasiadas consultas (límite por IP) o el proveedor de IA está saturado (CHATBOT_BUSY)
 *       502:
 *         description: El proveedor de IA devolvió una respuesta vacía (CHATBOT_BAD_RESPONSE)
 *       503:
 *         description: Asistente no disponible o sin configurar (CHATBOT_UNAVAILABLE)
 */
router.post('/ask', chatbotLimiter, validate({ body: askBody }), controller.ask);

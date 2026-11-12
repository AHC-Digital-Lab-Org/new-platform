# Plan de commits — chatbot (backend)

Rama: `feature/chatbot-module`. Un commit = una idea, con sus pruebas, y `npm test --workspace backend` en verde.
Antes de cada commit: `git diff --staged` (ni `.env` ni claves).

## Contrato

- `POST /api/chatbot/ask` → `{ question, history? }` → `{ answer, sources: [] }`
- `history`: máx. 10 turnos de `{ role: 'user' | 'assistant', text }`, 2000 caracteres por turno
- Errores: 429 `CHATBOT_BUSY` · 503 `CHATBOT_UNAVAILABLE` · 502 `CHATBOT_BAD_RESPONSE`

## B1 — `chore(chatbot): añade @google/genai y variables GEMINI_* al entorno`

- [ ] `package.json` y lockfile (+ `@google/genai`)
- [ ] `env.js`: `gemini.apiKey` y `gemini.model` (con valor por defecto), **sin** exigirlos al arrancar
- [ ] `.env.example` con `GEMINI_API_KEY` y `GEMINI_MODEL`
- Listo si: el backend arranca sin clave y `npm test` sigue verde

## B2 — `feat(chatbot): valida pregunta e historial con Zod`

- [ ] `chatbot.schema.js`: `question` (trim, 1–2000), `history` opcional (≤10, roles cerrados), `.strict()`
- [ ] `chatbot.schema.test.js`: vacío, solo espacios, demasiado largo, rol inválido, campo extra, historial largo
- Listo si: el contrato anterior se aplica y el controlador pasa `history` al servicio

## B3 — `feat(chatbot): responde con Gemini y el system prompt de la AHC`

- [ ] `system-prompt.md` (con línea de "última revisión")
- [ ] `chatbot.provider.js`: crea el cliente, temperatura 0.2, máx. 1024 tokens; es el único archivo que importa el SDK
- [ ] `chatbot.service.js`: `history` + `question` → contenido; `assistant` → `model`
- [ ] `chatbot.service.test.js` con el proveedor simulado
- Listo si: responde `{ answer, sources: [] }` y ningún test llama a Gemini de verdad

## B4 — `feat(chatbot): traduce errores del proveedor al contrato de la API`

- [ ] Sin clave configurada → 503 `CHATBOT_UNAVAILABLE`
- [ ] Gemini 429 → 429 `CHATBOT_BUSY`
- [ ] Gemini 401/403/404 → log de error + 503 genérico
- [ ] Gemini 5xx → 503; respuesta vacía → 502 `CHATBOT_BAD_RESPONSE`
- [ ] Verifica en el SDK dónde viene el código HTTP (`status` o `code`)
- Listo si: ningún mensaje al cliente incluye detalles del SDK

## B5 — `feat(chatbot): limita las consultas por IP`

- [ ] `chatbotLimiter` en `rate-limit.middleware.js`
- [ ] `chatbot.routes.js`: limiter antes de `validate`, OpenAPI con `history` y errores
- [ ] `chatbot.api.test.js` (supertest): 200, 400, 429, 503
- Listo si: `RATE_LIMIT_IN_TEST=true npm test --workspace backend -- chatbot.api` pasa

## B9 — `docs(chatbot): añade casos de prueba manuales`

- [ ] `casos-de-prueba.md` (casos manuales del chatbot e historial)

## B10 — `docs(chatbot): añade README de backend y frontend`

- [ ] `README.md` del módulo, con estructura, contrato, variables de entorno y cómo probar

## Fuera de este PR

RAG y `sources` reales · streaming · guardar conversaciones · evals automáticos · idiomas

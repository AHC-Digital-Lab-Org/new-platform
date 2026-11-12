# Plan de commits — chatbot (frontend)

Rama: `feature/chatbot-module` (después de B5). Cada commit con `npm test --workspace frontend` y `npm run build` en verde.

## Contrato consumido

- `ask({ question, history })` → `POST /chatbot/ask` → `{ answer, sources }`
- Roles del historial: `user` y `assistant`
- Códigos de error: `CHATBOT_BUSY`, `CHATBOT_UNAVAILABLE`, `CHATBOT_BAD_RESPONSE`

## F6 — `feat(chatbot-ui): envía el historial y gestiona el estado del chat`

- [ ] `api.js`: `ask(question, history)`
- [ ] `useChat.js`: `messages`, `sending`, `send`, `reset`; recorta el historial a los últimos 10 turnos
- [ ] Mensajes de error en español según el código; sin mostrar `err.message` crudo
- [ ] `useChat.test.jsx`: envía, error, reinicio, no envía vacío ni mientras `sending`
- Listo si: el comportamiento de `index.jsx` no cambia aún para el usuario

## F7 — `feat(chatbot-ui): separa mensajes y entrada en componentes accesibles`

- [ ] `ChatMessages.jsx`: `role="log"` con `aria-live="polite"`, scroll al último mensaje
- [ ] `ChatComposer.jsx`: etiqueta asociada, `maxLength={2000}`, deshabilitado mientras carga
- [ ] `index.jsx` queda como composición delgada de ambos
- Listo si: se usa con teclado y las pruebas siguen en verde

## F8 — `feat(chatbot-ui): añade bienvenida, sugerencias, reinicio y aviso de privacidad`

- [ ] Mensaje de bienvenida y 4 preguntas sugeridas (Campus, EcoGesto, MITECO, roles)
- [ ] Botón "Nueva conversación", visible solo si hay mensajes
- [ ] Aviso: no compartir contraseñas ni datos personales
- [ ] `Chatbot.test.jsx`: sugerencia envía pregunta, reinicio limpia, error visible con `role="alert"`
- Listo si: el flujo completo funciona contra el backend local

## Decisiones de interfaz

- Respuestas en Markdown mediante `react-markdown`, sin HTML crudo
- Mantener los estilos y el tema existentes

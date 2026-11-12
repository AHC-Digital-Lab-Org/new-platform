# Chatbot — frontend

Rama de trabajo: `feature/chatbot-module`.

## Estado actual

El backend del chatbot (B1–B5) está implementado. La interfaz todavía es la pantalla inicial en `index.jsx`: envía solo la pregunta, no conserva historial y muestra el texto devuelto por el stub actual. Los archivos `useChat.js`, `components/` y `__tests__/` son estructura preparada; aún no implementan el flujo del chat.

## Contrato del backend

`POST /api/chatbot/ask`

```js
ask({
  question: '¿Qué es un EcoGesto?',
  history: [{ role: 'user', text: 'Hola' }],
  locale: 'es',
});
```

El backend acepta `history` opcional con hasta 10 mensajes `user`/`assistant` y `locale` opcional (`es`, `ca`, `en`). Responde `{ answer, sources }`. Códigos que deberá manejar la interfaz:

- `CHATBOT_BUSY`: espera un poco antes de reintentar.
- `CHATBOT_UNAVAILABLE`: servicio no configurado o temporalmente indisponible.
- `CHATBOT_BAD_RESPONSE`: el proveedor no devolvió una respuesta válida.
- `VALIDATION_ERROR`: los datos enviados no cumplen el contrato.

No mostrar errores internos del proveedor. No pedir ni enviar datos personales o contraseñas.

## Próximos cambios

Cada etapa debe quedar con `npm test --workspace frontend` y `npm run build` en verde.

### F6 — estado del chat e historial

- Cambiar `api.js` para enviar pregunta, historial e idioma.
- Implementar `useChat.js` con `messages`, `sending`, `send` y `reset`; limitar el historial enviado a los últimos 10 turnos.
- Mostrar mensajes de error en español según el código, sin exponer `err.message`.
- Cubrir envío, error, reinicio, texto vacío y envío mientras ya hay una solicitud.

### F7 — componentes accesibles

- `ChatMessages.jsx`: región `role="log"`, `aria-live="polite"` y desplazamiento al mensaje más reciente.
- `ChatComposer.jsx`: etiqueta asociada, límite de 2000 caracteres y desactivación durante el envío.
- Dejar `index.jsx` como composición de los componentes.

### F8 — experiencia completa

- Añadir bienvenida y preguntas sugeridas sobre Campus, EcoGesto, MITECO y roles.
- Añadir “Nueva conversación” cuando haya mensajes y un aviso de privacidad.
- Probar sugerencias, reinicio y errores accesibles con `role="alert"`.

## Decisiones de interfaz

- Mostrar respuestas con `react-markdown` sin permitir HTML crudo.
- Mantener los estilos y el tema existentes.

# Chatbot — backend

Rama de trabajo: `feature/chatbot-module`.

## Estado

Los commits B1–B5 están implementados. El backend valida las consultas, mantiene el historial, llama a Gemini, normaliza los errores del proveedor y limita las peticiones por IP. Las pruebas usan un proveedor simulado; no hacen llamadas reales a Gemini.

## Contrato de la API

`POST /api/chatbot/ask`

```json
{
  "question": "¿Qué es un EcoGesto?",
  "history": [
    { "role": "user", "text": "Hola" },
    { "role": "assistant", "text": "¡Hola! ¿En qué te ayudo?" }
  ],
  "locale": "es"
}
```

- `question`: texto obligatorio, recortado y de 1 a 2000 caracteres.
- `history`: opcional; hasta 10 turnos, cada uno de hasta 2000 caracteres. Los únicos roles permitidos son `user` y `assistant`. Si se omite, el backend usa `[]`.
- `locale`: opcional; `es`, `ca` o `en`. Se usa como indicación para los mensajes breves o ambiguos.
- Los objetos de entrada rechazan propiedades adicionales.
- Respuesta correcta: `{ "answer": "...", "sources": [] }`. Las fuentes reales y RAG están fuera del alcance actual.

### Errores

| HTTP | Código | Significado |
|---|---|---|
| 400 | `VALIDATION_ERROR` | La pregunta, el historial o el idioma no cumplen el contrato |
| 429 | `TOO_MANY_REQUESTS` | Se alcanzó el límite local de 30 solicitudes por IP cada 15 minutos |
| 429 | `CHATBOT_BUSY` | Gemini indica límite o cuota excedidos |
| 502 | `CHATBOT_BAD_RESPONSE` | Gemini devolvió una respuesta vacía |
| 503 | `CHATBOT_UNAVAILABLE` | Falta la clave o Gemini/el modelo no está disponible |

Los detalles del proveedor no se exponen al cliente. El prompt del sistema está en [`system-prompt.md`](./system-prompt.md); la AHC debe confirmar sus datos de contacto y contenido antes del despliegue.

## Configuración

El backend lee las variables del archivo `backend/.env` en desarrollo. Parte de [`backend/.env.example`](../../../.env.example):

```dotenv
GEMINI_API_KEY=
GEMINI_MODEL=gemini-3.1-flash-lite
```

`GEMINI_API_KEY` es opcional para iniciar la API; si no está configurada, el endpoint devuelve `503 CHATBOT_UNAVAILABLE`. No guardes ni compartas claves en el repositorio o en el chat. `GEMINI_MODEL` tiene un valor predeterminado en la configuración del backend.

## Implementación

- `chatbot.schema.js`: validación Zod del cuerpo.
- `chatbot.controller.js` y `chatbot.routes.js`: endpoint, validación y OpenAPI.
- `chatbot.service.js`: prompt, traducción de roles y mapeo de errores.
- `chatbot.provider.js`: único módulo que importa `@google/genai`; configura temperatura `0.2` y máximo `1024` tokens.
- `system-prompt.md`: instrucciones y base de conocimiento.
- `__tests__/`: pruebas de esquema, servicio y API, incluyendo límite por IP.

## Verificación

Desde la raíz del monorepo:

```powershell
npm test --workspace backend
npm run dev --workspace backend
```

Para comprobar la validación con el backend activo, envía un cuerpo con un rol `system` en `history`; debe responder 400. Sin una clave Gemini configurada, una consulta válida debe responder 503. Las pruebas automatizadas simulan Gemini y no necesitan una clave.

## Pendiente

- Revisar con la AHC la exactitud y vigencia de los datos del prompt, incluidos teléfonos, correos y la referencia MITECO.
- Añadir y ejecutar los casos de prueba manuales en [`casos-de-prueba.md`](./casos-de-prueba.md).
- Probar una consulta real con una clave local, sin incluirla en commits ni logs.
- RAG y fuentes reales, streaming, persistencia de conversaciones e idiomas adicionales quedan fuera de alcance.

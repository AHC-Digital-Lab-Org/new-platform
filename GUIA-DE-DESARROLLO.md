# Guía de desarrollo

Esta guía reúne las convenciones del monorepo para que backend, frontend y
módulos nuevos mantengan una estructura y un estilo coherentes. Describe las
prácticas existentes; si una tarea requiere una excepción, que sea pequeña y
explícita.

## Principios de trabajo

1. **Resolver la necesidad completa con el cambio más acotado posible.**
   Evita refactors y dependencias que no hagan falta para el objetivo.
2. **Seguir el flujo y la arquitectura existentes.** Busca primero código
   parecido y reutiliza sus helpers y contratos.
3. **Separar responsabilidades.** La interfaz no implementa reglas del
   servidor; controladores no contienen lógica de persistencia; los servicios
   no dependen de Express.
4. **Validar entradas en los límites del sistema.** No des por válido un dato
   porque el formulario ya lo comprobó: el backend también debe validarlo.
5. **Hacer fallos explícitos.** Devuelve errores con el contrato establecido;
   evita capturar excepciones para ignorarlas o devolver respuestas que
   aparenten éxito.
6. **Probar el comportamiento solicitado.** Añade o actualiza pruebas para
   cambios funcionales y ejecuta los comandos pertinentes antes de terminar.

## Organización por capas

### Backend

Un módulo de negocio vive en `backend/src/modules/<modulo>/`. Para endpoints,
usa el flujo:

```text
routes → middleware → controller → service → Prisma / infraestructura
```

- **Rutas (`*.routes.js`):** declaran el método y la ruta, ordenan los
  middlewares y documentan cada endpoint con OpenAPI.
- **Esquemas (`*.schema.js`):** validan cuerpos, parámetros y consultas con
  Zod. Las rutas usan `validate({ body, query, params })`; el controlador recibe
  los datos ya validados en `req.valid`.
- **Controladores (`*.controller.js`):** conectan HTTP con los servicios,
  seleccionan el estado HTTP y construyen el JSON de respuesta.
- **Servicios (`*.service.js`):** implementan las reglas de negocio y acceden
  a Prisma o a infraestructura. No reciben ni manipulan `req`/`res`.
- **Pruebas (`__tests__/`):** prueban servicio, endpoints y middleware según la
  responsabilidad cubierta.

Importa lo compartido mediante los alias configurados (`#infrastructure/*`,
`#middleware/*`, `#shared/*`, `#platform/*`). No importes archivos internos de
otro módulo. Si una regla realmente es común, colócala en `shared/` o en
`platform/` según su propósito.

### Frontend

Un módulo de interfaz vive en `frontend/src/modules/<modulo>/`.

- **Páginas:** componen pantallas y coordinan formularios, navegación y estado
  visible.
- **Componentes:** encapsulan piezas reutilizables de UI y su interacción.
- **Cliente API:** concentra las funciones que llaman al backend; no dupliques
  `fetch` ni el manejo de errores dentro de cada pantalla.
- **Contextos y hooks:** comparten estado o comportamiento entre componentes
  cuando hay más de un consumidor; evita abstraer una operación que solo se
  usa una vez.
- **Pruebas:** colócalas junto al componente o módulo como `*.test.jsx` o
  `*.test.js`.

Usa el cliente común `@/shared/api/client.js` para las llamadas HTTP y los
helpers existentes, como `useSubmit`, para estados de carga y error.

## JavaScript y estilo

- El proyecto usa **ES modules** (`"type": "module"`): importa y exporta con
  `import`/`export`, no con `require`/`module.exports`.
- Usa dos espacios para indentación, comillas simples en JavaScript y
  punto y coma, siguiendo los archivos del proyecto. Conserva comas finales
  cuando el formato multilínea existente las use.
- Usa `const` por defecto y `let` solo cuando el valor deba reasignarse.
  Evita `var`.
- Prefiere funciones pequeñas con una responsabilidad identificable. En
  servicios y controladores se usan funciones flecha exportadas con nombre;
  componentes React exportan normalmente una función con nombre y PascalCase.
- Usa `camelCase` para variables y funciones; `PascalCase` para componentes
  React y clases; `UPPER_SNAKE_CASE` para constantes globales inmutables.
- Nombra por intención y dominio: `register`, `findUserOrFail`,
  `RegisterPage`, `TwoFactorStep`. Evita abreviaturas opacas y nombres
  genéricos como `data`, `value` o `handler` cuando el contexto no los aclare.
- No añadas comentarios que repitan el código. Comenta solo decisiones o
  comportamientos no obvios.
- Mantén la documentación de cara al usuario y de los flujos en español,
  como el resto del repositorio. Usa nombres del dominio consistentes con los
  contratos actuales.

El repositorio no define actualmente una configuración de ESLint, Prettier ni
EditorConfig. No dependas de que un formateador automático imponga estas
convenciones; conserva el estilo local de los archivos que edites.

## Funciones, datos y errores

### Backend

- Valida todos los datos externos con Zod antes de ejecutar la lógica del
  servicio. Usa esquemas estrictos (`.strict()`) cuando no se deban aceptar
  propiedades adicionales.
- Mantén en el servicio las reglas de negocio; deja al controlador la
  traducción entre servicio y HTTP.
- Para errores esperados, usa `AppError` o las clases existentes con estado,
  código y mensaje coherentes. Deja que el middleware global los convierta al
  formato `{ error: { code, message, details } }`.
- No ocultes errores inesperados con un `catch` vacío ni retornes datos de
  éxito como alternativa a una operación fallida. Registra el contexto útil
  según el logger del proyecto y conserva la respuesta de error apropiada.
- Usa `async`/`await` para flujos asíncronos. Si una operación no bloquea la
  respuesta (por ejemplo, un correo), captura y registra igualmente su
  rechazo; no dejes promesas rechazadas sin manejar.
- En respuestas públicas, excluye credenciales, secretos, tokens internos y
  hashes mediante el saneamiento o la selección de campos apropiados.
- Lee variables de entorno desde `backend/src/infrastructure/config/env.js`,
  no directamente desde cualquier módulo. Los cambios de configuración deben
  actualizar también `backend/.env.example`.
- Define los modelos en el esquema Prisma del módulo correspondiente y crea
  una migración versionada cuando cambie la estructura de datos. No edites
  migraciones ya aplicadas para representar cambios nuevos.

### Frontend

- Maneja explícitamente los estados de carga, éxito y error; deshabilita
  acciones mientras una petición está en curso cuando corresponda.
- Conserva la validación del cliente para dar feedback inmediato, pero trata
  la respuesta del backend como autoridad final.
- Muestra errores mediante los helpers existentes (`authErrorMessage`,
  `FormError`, `useSubmit`) en vez de duplicar traducciones o manejo de
  `fetch`.
- Para formularios, conserva etiquetas asociadas, mensajes de error accesibles,
  foco útil al fallar la validación y estados `role="alert"`/`role="status"`
  cuando apliquen.
- No guardes secretos ni datos de sesión en URLs o logs. Usa las utilidades de
  sesión existentes; no dupliques el almacenamiento del token.

## Nombres de archivos y pruebas

- Backend: sufijos descriptivos como `.routes.js`, `.controller.js`,
  `.service.js`, `.schema.js` y `.test.js`; pruebas del backend bajo
  `__tests__/`.
- Frontend: componentes y páginas React en PascalCase (`LoginPage.jsx`,
  `TwoFactorStep.jsx`); pruebas con el mismo nombre más `.test.jsx`.
- Da a las pruebas nombres que describan el resultado observable, no detalles
  de implementación.
- Prueba primero lo que puede fallar en el cambio: validación, respuestas HTTP,
  reglas de negocio, accesibilidad o transiciones de estado.
- En las pruebas de backend, simula Prisma, SMTP u otros servicios externos
  cuando la prueba no requiera una integración real. Deja las pruebas de
  integración para contratos y comportamiento que realmente necesiten la app
  montada.

## API y contratos

- Cada endpoint nuevo debe tener documentación `@openapi` junto a su ruta.
- Mantén consistentes ruta, esquema, controlador, servicio, cliente API,
  mensajes y pruebas al cambiar un contrato.
- Usa códigos HTTP apropiados: `2xx` para éxito, `4xx` para solicitudes o
  credenciales rechazadas, `409` para conflictos y `5xx` para errores
  inesperados del servidor.
- No reveles si una cuenta existe en flujos que deben ser no enumerativos,
  como solicitar recuperación o reenviar verificación.

## Commits

El historial usa mensajes breves del estilo **Conventional Commits**, con tipo
en minúsculas, alcance entre paréntesis y descripción después de dos puntos.
La descripción suele escribirse en español:

```text
<tipo>(<alcance>): <descripción breve>
```

Ejemplos basados en las convenciones del repositorio:

```text
feat(auth): añade verificación de email
fix(auth-ui): corrige el estado del formulario de login
test(auth): cubre límite de intentos 2FA
docs(auth): documenta el flujo de recuperación
chore(frontend): actualiza dependencias de desarrollo
```

Tipos habituales:

| Tipo | Uso |
| --- | --- |
| `feat` | Añade una capacidad |
| `fix` | Corrige un defecto |
| `test` | Añade o ajusta pruebas sin cambiar el comportamiento de producción |
| `docs` | Cambia documentación |
| `refactor` | Reorganiza código sin cambiar el comportamiento esperado |
| `chore` | Mantenimiento, configuración o tareas auxiliares |

Usa un alcance concreto (`auth`, `auth-ui`, `frontend`, `backend`) y describe
el resultado del cambio, no el proceso de trabajo. Evita mensajes vagos como
`updates`, `fix stuff` o `cambios`.

## Comandos de validación

Desde la raíz del monorepo:

```bash
npm test                           # pruebas de backend y frontend
npm test --workspace backend       # solo backend
npm test --workspace frontend      # solo frontend
npm run build                      # build del frontend
```

Si el cambio toca esquema o migraciones, valida además Prisma y las migraciones
con los scripts correspondientes (`npm run db:generate` o
`npm run db:deploy`, según el contexto). No ejecutes una migración de
producción como parte de una validación local.

## Documentación relacionada

- [README del producto](./README.md)
- [Guía del módulo de autenticación backend](./backend/src/modules/auth/README.md)
- [Guía del módulo de autenticación frontend](./frontend/src/modules/auth/README.md)

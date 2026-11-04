# Web Platform

Plataforma web modular: cada proyecto (Ecogestos, Chatbot, …) es un **módulo** independiente que desarrolla un equipo, con su API, sus tablas y sus pantallas.

## Guía de desarrollo

Consulta la [Guía de desarrollo](./GUIA-DE-DESARROLLO.md) para conocer las
convenciones de código, arquitectura, pruebas y mensajes de commit antes de
trabajar en backend o frontend.

## Stack

| Capa | Pieza |
|---|---|
| Base | Node.js ≥ 22.12, JavaScript (ES modules), npm workspaces |
| Backend | Express 5, Prisma 6 (MariaDB), Zod (validación), Swagger/OpenAPI (`swagger-jsdoc` + `swagger-ui-express`), Vitest |
| Frontend | React 19, Vite, React Router 7, Tailwind CSS 4 |
| Despliegue | Frontend en Vercel · API en Render · MariaDB gestionada |

Se añadirán librerías (TanStack Query, i18n, gráficos…) solo cuando un módulo las necesite de verdad.

## Puesta en marcha

### MariaDB local en Docker

Docker no es un requisito de Express ni de Prisma. Para desarrollo permite usar
MariaDB sin instalarla directamente en Windows y mantener la misma familia de
base de datos que usa el backend. La aplicación Node.js corre en el host; solo
MariaDB corre dentro del contenedor.

El repositorio no incluye actualmente un `docker-compose.yml` ni define el
nombre del contenedor, usuario, contraseña o nombre de base de datos. Usa la
configuración Docker local que ya tengas. En el entorno local revisado existe
el contenedor `mariadb-test` (`mariadb:11`), actualmente detenido, con el puerto
del host `3307` publicado hacia el `3306` del contenedor:

1. Inicia Docker Desktop y comprueba que el contenedor MariaDB está activo:

   ```powershell
   docker ps
   ```

   Inicia el contenedor existente con `docker start mariadb-test`. Comprueba
   que aparece en `docker ps` y que el puerto del host `3307` apunta a
   `3306/tcp`. Si estás en otro entorno, usa el puerto que muestre Docker.
2. Copia `backend/.env.example` a `backend/.env` y configura `DATABASE_URL`
   con el puerto, usuario, contraseña y base de datos definidos para ese
   contenedor:

   Para este contenedor, la URL usa el puerto `3307` del host:

   ```text
   DATABASE_URL="mysql://<usuario>:<contraseña>@127.0.0.1:3307/<base_de_datos>"
   ```

   Sustituye los marcadores por los valores reales. Si la contraseña contiene
   caracteres reservados de URL, codifícalos antes de ponerla en la URL.
3. Desde la raíz, ejecuta `npm install`, `npm run db:migrate` y luego
   `npm run dev`. Para datos de ejemplo, ejecuta opcionalmente
   `npm run db:seed`.

No uses `npm run db:deploy` como sustituto de `db:migrate` durante el desarrollo:
`db:deploy` aplica las migraciones existentes sin crear una migración nueva.
El frontend no se conecta a MariaDB; llama a la API backend. Por eso las pruebas
del frontend no necesitan Docker ni una base de datos.

```bash
npm install
npm run db:migrate
npm run dev
```

`npm run db:seed` es opcional y carga datos de ejemplo.

- Web: http://localhost:5173
- API: http://localhost:3000/api
- Swagger: http://localhost:3000/api/docs (JSON en `/api/docs.json`)

## Estructura

```
new-platform/
├── backend/
│   ├── prisma/
│   │   ├── schema/
│   │   │   ├── schema.prisma    # generator + datasource (común)
│   │   │   ├── ecogestos.prisma # modelos de cada módulo en su fichero
│   │   │   └── migrations/
│   │   └── seed.js
│   ├── src/
│   │   ├── modules/             # módulos de negocio (uno por equipo)
│   │   │   ├── index.js         # registro: se montan en /api/<nombre>
│   │   │   ├── ecogestos/
│   │   │   └── chatbot/
│   │   ├── platform/
│   │   ├── middleware/
│   │   ├── infrastructure/
│   │   ├── shared/
│   │   ├── app.js
│   │   └── server.js
│   └── tests/integration/
├── frontend/
│   └── src/
│       ├── modules/
│       │   ├── index.js         # registro de módulos y rutas
│       │   ├── ecogestos/
│       │   └── chatbot/
│       ├── shared/              # API client, componentes y hooks
│       ├── pages/               # Home, 404
│       └── App.jsx
└── shared/                      # Workspace @web-platform/shared
    ├── alias-policy.js
    └── location-catalog.js
```

## Reglas de los módulos

1. **Un módulo no importa ficheros internos de otro módulo.** Si necesita algo compartido, va a `platform/` o `shared/`.
2. Los módulos del backend importan lo común con alias: `#infrastructure/…`, `#middleware/…`, `#shared/…`, `#platform/…`.
3. Las tablas de cada módulo se definen en `prisma/schema/<modulo>.prisma` y llevan prefijo: `@@map("ecogestos_products")`.
4. Cada endpoint se documenta con un comentario `@openapi` junto a su ruta; Swagger lo recoge solo.
5. Los datos de entrada se validan con `validate({ body, query, params })`; los valores limpios quedan en `req.valid`.
6. Los errores se lanzan (`throw new NotFoundError()`); el middleware de errores responde siempre `{ error: { code, message, details } }`.

### Crear un módulo nuevo

```bash
npm run new:module -- voluntariado
```

Crea el esqueleto en backend y frontend e indica las dos líneas que hay que añadir a los registros.

## Scripts

| Script | Qué hace |
|---|---|
| `npm run dev` | Backend (con recarga) y frontend a la vez |
| `npm test` | Tests del backend y frontend (Vitest) |
| `npm run build` | Build de producción del frontend |
| `npm run db:migrate` | Crea/aplica migraciones en desarrollo |
| `npm run db:deploy` | Aplica migraciones en producción |
| `npm run db:studio` | Explorador visual de la BD |

## Despliegue

**API en Render** (Web Service, raíz del repo):
- Build: `npm ci && npm run db:deploy`
- Start: `npm start`
- Variables obligatorias: `DATABASE_URL`, `NODE_ENV=production`, `JWT_SECRET` (aleatorio, mínimo 32 caracteres), `TOTP_ENCRYPTION_KEY` (64 caracteres hexadecimales), `CORS_ORIGIN`, `FRONTEND_URL`, `SMTP_HOST`, `TRUST_PROXY` y `CONSENT_POLICY_VERSION`.
- `TRUST_PROXY` debe ser el número real de proxies delante de Render. El rate-limit usa memoria; antes de escalar a varias instancias, configura un store compartido.
- `npm run db:deploy` aplica las migraciones versionadas de `backend/prisma/schema/migrations` durante el build.

**Frontend en Vercel**:
- Framework: Vite. Instala los workspaces desde la raíz del monorepo.
- Si estableces `frontend` como Root Directory, activa **Include source files outside Root Directory** y configura la instalación para incluir el workspace raíz `shared`.
- Variable: `VITE_API_URL` = URL de Render (p. ej. `https://web-platform-api.onrender.com`)
- `frontend/vercel.json` redirige todas las rutas a `index.html` (SPA).
- La CSP de `frontend/vercel.json` también debe permitir el mismo origen de API en `connect-src`; actualízalo si tu servicio de Render tiene otro dominio.
- El workspace `shared` declara `country-state-city` (GPL-3.0), usado por el backend para validar y buscar ciudades; revisa sus condiciones al distribuir el servicio.
- En desarrollo, MariaDB puede correr en un contenedor Docker local. En producción, `DATABASE_URL` debe apuntar al servicio MariaDB de producción; no uses las credenciales locales.

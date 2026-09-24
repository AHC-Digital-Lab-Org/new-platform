# Web Platform

Plataforma web modular: cada proyecto (Ecogestos, Chatbot, …) es un **módulo** independiente que desarrolla un equipo, con su API, sus tablas y sus pantallas.

## Stack

| Capa | Pieza |
|---|---|
| Base | Node.js ≥ 22.12, JavaScript (ES modules), npm workspaces |
| Backend | Express 5, Prisma 6 (MariaDB), Zod (validación), Swagger/OpenAPI (`swagger-jsdoc` + `swagger-ui-express`), Vitest |
| Frontend | React 19, Vite, React Router 7, Tailwind CSS 4 |
| Despliegue | Frontend en Vercel · API en Render · MariaDB gestionada |

Se añadirán librerías (TanStack Query, i18n, gráficos…) solo cuando un módulo las necesite de verdad.

## Puesta en marcha

```bash
npm install
cp backend/.env.example backend/.env    # rellenar DATABASE_URL
npm run db:migrate                      # aplica migraciones
npm run db:seed                         # datos de ejemplo (opcional)
npm run dev                             # API :3000 + web :5173
```

- Web: http://localhost:5173
- API: http://localhost:3000/api
- Swagger: http://localhost:3000/api/docs (JSON en `/api/docs.json`)

## Estructura

```
backend/
├── prisma/
│   ├── schema/
│   │   ├── schema.prisma        # generator + datasource (común)
│   │   ├── ecogestos.prisma     # modelos de cada módulo en su fichero
│   │   └── migrations/
│   └── seed.js
├── src/
│   ├── modules/                 # módulos de negocio (uno por equipo)
│   │   ├── index.js             # registro: se montan en /api/<nombre>
│   │   ├── ecogestos/
│   │   │   ├── index.js                 # API pública del módulo: { name, router }
│   │   │   ├── ecogestos.routes.js      # rutas + documentación @openapi
│   │   │   ├── ecogestos.controller.js  # req/res
│   │   │   ├── ecogestos.service.js     # lógica de negocio y acceso a datos
│   │   │   ├── ecogestos.schema.js      # validación Zod
│   │   │   └── __tests__/
│   │   └── chatbot/
│   ├── platform/                # servicios transversales (audit, identity…)
│   ├── middleware/              # validate, error, logging
│   ├── infrastructure/          # config, prisma, logger, openapi
│   ├── shared/                  # errores y utilidades comunes
│   ├── app.js
│   └── server.js
└── tests/integration/

frontend/src/
├── modules/
│   ├── index.js                 # registro: ruta, etiqueta del menú y carga diferida
│   ├── ecogestos/               # index.jsx (subrutas), api.js, pages/
│   └── chatbot/
├── shared/                      # api/client.js, components/, hooks/
├── pages/                       # Home, 404
└── App.jsx
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
| `npm test` | Tests del backend (Vitest) |
| `npm run build` | Build de producción del frontend |
| `npm run db:migrate` | Crea/aplica migraciones en desarrollo |
| `npm run db:deploy` | Aplica migraciones en producción |
| `npm run db:studio` | Explorador visual de la BD |

## Despliegue

**API en Render** (Web Service, raíz del repo):
- Build: `npm ci && npm run db:deploy`
- Start: `npm start`
- Variables: `DATABASE_URL`, `CORS_ORIGIN` (URL de Vercel), `NODE_ENV=production`

**Frontend en Vercel**:
- Root directory: `frontend` · Framework: Vite
- Variable: `VITE_API_URL` = URL de Render (p. ej. `https://web-platform-api.onrender.com`)
- `frontend/vercel.json` redirige todas las rutas a `index.html` (SPA).

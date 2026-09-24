// Crea el esqueleto de un módulo nuevo en backend y frontend.
// Uso: npm run new:module -- <nombre>   (en minúsculas, p. ej. voluntariado)
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const name = process.argv[2];
if (!/^[a-z][a-z0-9-]*$/.test(name ?? '')) {
  console.error('Uso: npm run new:module -- <nombre>   (minúsculas, números y guiones)');
  process.exit(1);
}
const label = name[0].toUpperCase() + name.slice(1);
const root = path.resolve(import.meta.dirname, '..');
const backDir = path.join(root, 'backend/src/modules', name);
const frontDir = path.join(root, 'frontend/src/modules', name);

if (existsSync(backDir) || existsSync(frontDir)) {
  console.error(`El módulo "${name}" ya existe.`);
  process.exit(1);
}

const write = (dir, file, content) => {
  mkdirSync(dir, { recursive: true });
  writeFileSync(path.join(dir, file), content.trimStart());
};

write(backDir, 'index.js', `
import { router } from './${name}.routes.js';

export default { name: '${name}', router };
`);
write(backDir, `${name}.schema.js`, `
import { z } from 'zod';
`);
write(backDir, `${name}.service.js`, `
export const getStatus = async () => ({ module: '${name}', status: 'ok' });
`);
write(backDir, `${name}.controller.js`, `
import * as service from './${name}.service.js';

export const status = async (_req, res) => {
  res.json(await service.getStatus());
};
`);
write(backDir, `${name}.routes.js`, `
import { Router } from 'express';
import * as controller from './${name}.controller.js';

export const router = Router();

/**
 * @openapi
 * /${name}/status:
 *   get:
 *     tags: [${label}]
 *     summary: Estado del módulo
 *     responses:
 *       200:
 *         description: OK
 */
router.get('/status', controller.status);
`);
write(path.join(backDir, '__tests__'), '.gitkeep', '');

write(frontDir, 'api.js', `
import { api } from '@/shared/api/client.js';

export const getStatus = () => api('/${name}/status');
`);
write(frontDir, 'index.jsx', `
import { Route, Routes } from 'react-router';

function Home() {
  return <h1 className="text-2xl font-bold">${label}</h1>;
}

export default function ${label.replace(/-./g, (m) => m[1].toUpperCase())}() {
  return (
    <Routes>
      <Route index element={<Home />} />
    </Routes>
  );
}
`);

console.log(`Módulo "${name}" creado. Para activarlo, regístralo en:

  backend/src/modules/index.js
    import ${name.replace(/-./g, (m) => m[1].toUpperCase())} from './${name}/index.js';   // y añádelo al array

  frontend/src/modules/index.js
    { path: '/${name}', label: '${label}', Component: lazy(() => import('./${name}/index.jsx')) },

Si necesita tablas: crea backend/prisma/schema/${name}.prisma (tablas con @@map("${name}_...")) y ejecuta npm run db:migrate.`);

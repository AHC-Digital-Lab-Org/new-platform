import { PrismaClient } from '@prisma/client';
import { ROLES } from '../src/shared/roles.js';

const [email, role = ROLES.ADMIN] = process.argv.slice(2);

if (!email) {
  console.error('Uso: npm run db:set-role -w backend -- <email> [rol]');
  process.exit(1);
}

if (!Object.values(ROLES).includes(role)) {
  console.error(`Rol no válido: "${role}". Valores posibles: ${Object.values(ROLES).join(', ')}`);
  process.exit(1);
}

const prisma = new PrismaClient();

try {
  const user = await prisma.user.update({
    where: { email },
    data: { tipoUsuario: role },
  });
  console.log(`${user.email} ahora tiene el rol "${role}"`);
} catch (err) {
  console.error(
    err.code === 'P2025'
      ? `No existe ningún usuario con el email ${email}`
      : err.message,
  );
  process.exitCode = 1;
} finally {
  await prisma.$disconnect();
}

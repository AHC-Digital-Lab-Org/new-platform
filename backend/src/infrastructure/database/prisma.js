import { PrismaClient } from '@prisma/client';
import { isProduction } from '../config/env.js';

// Una sola instancia compartida por todos los módulos.
export const prisma = new PrismaClient({
  log: isProduction ? ['error'] : ['warn', 'error'],
});

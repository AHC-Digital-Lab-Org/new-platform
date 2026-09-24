import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const products = [
  { name: 'Bolsa de tela reutilizable', priceCents: 499, stock: 50 },
  { name: 'Botella de acero inoxidable', priceCents: 1599, stock: 30 },
  { name: 'Kit de cubiertos de bambú', priceCents: 899, stock: 40 },
];

if ((await prisma.product.count()) === 0) {
  await prisma.product.createMany({ data: products });
  console.log(`Seed: ${products.length} productos creados`);
} else {
  console.log('Seed: ya hay datos, no se hace nada');
}

await prisma.$disconnect();

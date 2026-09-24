import { prisma } from '#infrastructure/database/prisma.js';
import { NotFoundError } from '#shared/errors/index.js';
import { audit } from '#platform/audit/index.js';

export const listProducts = async ({ page, pageSize }) => {
  const where = { active: true };
  const [items, total] = await Promise.all([
    prisma.product.findMany({ where, orderBy: { createdAt: 'desc' }, skip: (page - 1) * pageSize, take: pageSize }),
    prisma.product.count({ where }),
  ]);
  return { items, total, page, pageSize };
};

export const getProduct = async (id) => {
  const product = await prisma.product.findUnique({ where: { id } });
  if (!product || !product.active) throw new NotFoundError('Producto no encontrado');
  return product;
};

export const createProduct = async (data) => {
  const product = await prisma.product.create({ data });
  audit('ecogestos.product.created', { id: product.id });
  return product;
};

import { z } from 'zod';

export const productIdParams = z.object({
  id: z.coerce.number().int().positive(),
});

export const listProductsQuery = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

export const createProductBody = z.object({
  name: z.string().trim().min(1).max(120),
  description: z.string().trim().max(2000).optional(),
  priceCents: z.number().int().min(0),
  stock: z.number().int().min(0).default(0),
});

import { expect, test } from 'vitest';
import { createProductBody, listProductsQuery } from '../ecogestos.schema.js';

test('createProductBody acepta un producto válido y aplica stock por defecto', () => {
  const data = createProductBody.parse({ name: ' Bolsa ', priceCents: 499 });
  expect(data).toEqual({ name: 'Bolsa', priceCents: 499, stock: 0 });
});

test('createProductBody rechaza precios negativos', () => {
  expect(createProductBody.safeParse({ name: 'X', priceCents: -1 }).success).toBe(false);
});

test('listProductsQuery convierte los parámetros de query a número', () => {
  expect(listProductsQuery.parse({ page: '2' })).toEqual({ page: 2, pageSize: 20 });
});

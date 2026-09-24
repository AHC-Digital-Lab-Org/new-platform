import { Router } from 'express';
import { validate } from '#middleware/validate.middleware.js';
import * as controller from './ecogestos.controller.js';
import { createProductBody, listProductsQuery, productIdParams } from './ecogestos.schema.js';

export const router = Router();

/**
 * @openapi
 * components:
 *   schemas:
 *     Product:
 *       type: object
 *       properties:
 *         id: { type: integer }
 *         name: { type: string }
 *         description: { type: string, nullable: true }
 *         priceCents: { type: integer, description: Precio en céntimos }
 *         stock: { type: integer }
 *         createdAt: { type: string, format: date-time }
 *     NewProduct:
 *       type: object
 *       required: [name, priceCents]
 *       properties:
 *         name: { type: string }
 *         description: { type: string }
 *         priceCents: { type: integer }
 *         stock: { type: integer, default: 0 }
 *
 * /ecogestos/products:
 *   get:
 *     tags: [Ecogestos]
 *     summary: Lista los productos de la tienda
 *     parameters:
 *       - { in: query, name: page, schema: { type: integer, default: 1 } }
 *       - { in: query, name: pageSize, schema: { type: integer, default: 20, maximum: 100 } }
 *     responses:
 *       200:
 *         description: Página de productos
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 items: { type: array, items: { $ref: '#/components/schemas/Product' } }
 *                 total: { type: integer }
 *                 page: { type: integer }
 *                 pageSize: { type: integer }
 *   post:
 *     tags: [Ecogestos]
 *     summary: Crea un producto
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema: { $ref: '#/components/schemas/NewProduct' }
 *     responses:
 *       201:
 *         description: Producto creado
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Product' }
 *       400:
 *         description: Datos no válidos
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Error' }
 */
router.get('/products', validate({ query: listProductsQuery }), controller.list);
router.post('/products', validate({ body: createProductBody }), controller.create);

/**
 * @openapi
 * /ecogestos/products/{id}:
 *   get:
 *     tags: [Ecogestos]
 *     summary: Obtiene un producto
 *     parameters:
 *       - { in: path, name: id, required: true, schema: { type: integer } }
 *     responses:
 *       200:
 *         description: Producto
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Product' }
 *       404:
 *         description: No existe
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Error' }
 */
router.get('/products/:id', validate({ params: productIdParams }), controller.getById);

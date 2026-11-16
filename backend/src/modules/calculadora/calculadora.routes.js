import { Router } from 'express';
import { calculadoraLimiter } from '#middleware/rate-limit.middleware.js';
import { validate } from '#middleware/validate.middleware.js';
import { ValidationError } from '#shared/errors/index.js';
import * as controller from './calculadora.controller.js';
import { calcularBody, calcularModuloBody, ESQUEMAS_MODULO, moduloParams } from './calculadora.schema.js';

export const router = Router();

// En /calcular/:modulo el esquema de `datos` depende del módulo de la ruta, ya validado por params.
const validarDatosModulo = (req, _res, next) => {
  const result = ESQUEMAS_MODULO[req.valid.params.modulo].safeParse(req.valid.body.datos);
  if (!result.success) {
    throw new ValidationError(result.error.issues.map((i) => ({ path: ['body', 'datos', ...i.path].join('.'), message: i.message })));
  }
  req.valid.body.datos = result.data;
  next();
};

/**
 * @openapi
 * components:
 *   schemas:
 *     CalculadoraGeneral:
 *       type: object
 *       properties:
 *         pais: { type: string, default: españa, description: Clave de país del catálogo (GET /calculadora/factores) }
 *         factorElectricoPersonalizado: { type: number, description: kg CO₂e/kWh documentado por la persona (opcional) }
 *     CalculadoraPartida:
 *       type: object
 *       properties:
 *         id: { type: string }
 *         etiqueta: { type: string }
 *         kg: { type: number, description: kg CO₂e/año }
 *         incertidumbreKg: { type: number, description: Incertidumbre absoluta (1σ) en kg CO₂e/año }
 *     CalculadoraResultadoModulo:
 *       type: object
 *       properties:
 *         modulo: { type: string, enum: [vivienda, transporte, vuelos, productos] }
 *         totalKg: { type: number }
 *         incertidumbreKg: { type: number }
 *         partidas: { type: array, items: { $ref: '#/components/schemas/CalculadoraPartida' } }
 *     CalculadoraEntrada:
 *       type: object
 *       description: Cada módulo es opcional; solo se calculan los enviados.
 *       properties:
 *         general: { $ref: '#/components/schemas/CalculadoraGeneral' }
 *         vivienda:
 *           type: object
 *           example: { personas: 2, consumos: { electricidad: { valor: 3000, unidad: kWh_anual }, gas: { valor: 300, unidad: m3_anual } } }
 *         transporte:
 *           type: object
 *           example: { coche: { km: 8000, energia: gasolina, consumo: 6.5, ocupacion: 1 }, publico: { metro: 1500 } }
 *         vuelos:
 *           type: object
 *           example: { viajes: [{ clase: economica, itinerario: ida_y_vuelta, veces: 1, tramos: [{ modo: aeropuertos, origen: MAD, destino: CDG }] }] }
 *         productos:
 *           type: object
 *           example: { dieta: omnivoro_medio, gastos: { comida_bebida: { importe: 250, frecuencia: mensual } } }
 *
 * /calculadora/calcular:
 *   post:
 *     tags: [Calculadora]
 *     summary: Calcula la huella de carbono personal anual
 *     description: Calcula los módulos enviados y devuelve el total, la comparación nacional orientativa, el indicador de planetas y pequeños gestos de reducción.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema: { $ref: '#/components/schemas/CalculadoraEntrada' }
 *     responses:
 *       200:
 *         description: Resultado completo
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 modulos: { type: object, additionalProperties: { $ref: '#/components/schemas/CalculadoraResultadoModulo' } }
 *                 totalKg: { type: number }
 *                 incertidumbreKg: { type: number }
 *                 comparacion: { type: object, nullable: true }
 *                 planetas: { type: object }
 *                 gestos: { type: array, items: { type: object } }
 *       400:
 *         description: Datos no válidos
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Error' }
 */
router.post('/calcular', calculadoraLimiter, validate({ body: calcularBody }), controller.calcular);

/**
 * @openapi
 * /calculadora/calcular/{modulo}:
 *   post:
 *     tags: [Calculadora]
 *     summary: Calcula un único módulo
 *     parameters:
 *       - { in: path, name: modulo, required: true, schema: { type: string, enum: [vivienda, transporte, vuelos, productos] } }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [datos]
 *             properties:
 *               general: { $ref: '#/components/schemas/CalculadoraGeneral' }
 *               datos: { type: object, description: Mismos datos que el módulo en POST /calculadora/calcular }
 *     responses:
 *       200:
 *         description: Resultado del módulo
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/CalculadoraResultadoModulo' }
 *       400:
 *         description: Datos no válidos o módulo desconocido
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Error' }
 */
router.post(
  '/calcular/:modulo',
  calculadoraLimiter,
  validate({ params: moduloParams, body: calcularModuloBody }),
  validarDatosModulo,
  controller.calcularModulo,
);

/**
 * @openapi
 * /calculadora/factores:
 *   get:
 *     tags: [Calculadora]
 *     summary: Catálogos y valores de ayuda del formulario
 *     description: Países, aeropuertos, tipos de vehículo, categorías de consumo y fuentes de los factores.
 *     responses:
 *       200:
 *         description: Catálogo
 */
router.get('/factores', calculadoraLimiter, controller.factores);

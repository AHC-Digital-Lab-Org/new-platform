import { z } from 'zod';
import { FUENTES_VIVIENDA } from './modulos/vivienda.js';
import { MODOS_PUBLICOS, TIPOS_TREN } from './modulos/transporte.js';
import { CLASES_VUELO, ITINERARIOS_VUELO } from './modulos/vuelos.js';
import { CATEGORIAS_PRODUCTOS, FRECUENCIAS } from './modulos/productos.js';

const claves = (objeto) => Object.keys(objeto);
const cantidad = (maximo) => z.number().min(0).max(maximo);

const consumoVivienda = (fuente) => z.object({
  valor: cantidad(1_000_000),
  unidad: z.enum(claves(FUENTES_VIVIENDA[fuente].unidades)),
}).strict();

export const generalSchema = z.object({
  pais: z.string().trim().min(1).max(60).default('españa'),
  factorElectricoPersonalizado: z.number().min(0).max(2).optional(),
}).strict();

export const viviendaSchema = z.object({
  personas: z.number().int().min(1).max(20),
  origenDato: z.enum(['factura', 'estimado']).default('factura'),
  consumos: z.object(Object.fromEntries(claves(FUENTES_VIVIENDA).map((fuente) => [fuente, consumoVivienda(fuente).optional()])))
    .strict()
    .default({}),
  excedenteFotovoltaicoKWh: cantidad(200_000).default(0),
}).strict();

const cocheSchema = z.object({
  km: cantidad(200_000),
  energia: z.enum(['gasolina', 'diesel', 'glp', 'hibrido_gasolina', 'hibrido_diesel', 'electrico', 'hibrido_enchufable']),
  consumo: z.number().positive().max(60),
  ocupacion: z.number().min(1).max(9).default(1),
  origenConsumoElectrico: z.enum(['no_se', 'contador_punto_carga', 'vehiculo_ficha']).default('no_se'),
  cargaIncluidaVivienda: z.enum(['no', 'si', 'parcial']).default('no'),
  porcentajeCargaIncluida: z.number().min(0).max(100).default(0),
  enchufable: z.object({
    combustibleTermico: z.enum(['gasolina', 'diesel']),
    porcentajeKmElectrico: z.number().min(0).max(100),
    consumoCombustible: z.number().positive().max(35),
  }).strict().optional(),
}).strict().refine((coche) => coche.energia !== 'hibrido_enchufable' || coche.enchufable, {
  message: 'El híbrido enchufable necesita los datos de su modo térmico',
  path: ['enchufable'],
});

export const transporteSchema = z.object({
  coche: cocheSchema.optional(),
  moto: z.object({
    km: cantidad(200_000),
    tipo: z.enum(['moto_pequena', 'moto_mediana', 'moto_grande']),
  }).strict().optional(),
  publico: z.object({
    ...Object.fromEntries(claves(MODOS_PUBLICOS).map((modo) => [modo, cantidad(500_000).optional()])),
    tipoTren: z.enum(claves(TIPOS_TREN)).default('tren_nacional'),
  }).strict().optional(),
}).strict();

const tramoSchema = z.discriminatedUnion('modo', [
  z.object({
    modo: z.literal('aeropuertos'),
    origen: z.string().trim().toUpperCase().length(3),
    destino: z.string().trim().toUpperCase().length(3),
  }).strict(),
  z.object({ modo: z.literal('km'), km: z.number().positive().max(20_000) }).strict(),
  z.object({ modo: z.literal('horas'), horas: z.number().positive().max(24) }).strict(),
]);

export const vuelosSchema = z.object({
  criterio: z.enum(['ampliado', 'directo']).default('ampliado'),
  viajes: z.array(z.object({
    clase: z.enum(claves(CLASES_VUELO)).default('economica'),
    itinerario: z.enum(claves(ITINERARIOS_VUELO)).default('ida_y_vuelta'),
    veces: z.number().int().min(1).max(100).default(1),
    tramos: z.array(tramoSchema).min(1).max(6),
  }).strict()).max(50).default([]),
}).strict();

export const productosSchema = z.object({
  moneda: z.enum(['EUR', 'USD']).default('EUR'),
  dieta: z.enum(['no_especificar', 'vegana', 'vegetariana', 'omnivoro_bajo_carne', 'omnivoro_medio', 'omnivoro_alto_carne_roja'])
    .default('no_especificar'),
  gastos: z.object(Object.fromEntries(CATEGORIAS_PRODUCTOS.map(({ id }) => [id, z.object({
    importe: cantidad(1_000_000),
    frecuencia: z.enum(claves(FRECUENCIAS)).optional(),
    vidaUtil: z.number().min(0.5).max(50).optional(),
  }).strict().optional()]))).strict().default({}),
}).strict();

export const ESQUEMAS_MODULO = {
  vivienda: viviendaSchema,
  transporte: transporteSchema,
  vuelos: vuelosSchema,
  productos: productosSchema,
};

export const moduloParams = z.object({
  modulo: z.enum(claves(ESQUEMAS_MODULO)),
}).strict();

export const calcularBody = z.object({
  general: generalSchema.default({ pais: 'españa' }),
  vivienda: viviendaSchema.optional(),
  transporte: transporteSchema.optional(),
  vuelos: vuelosSchema.optional(),
  productos: productosSchema.optional(),
}).strict();

export const calcularModuloBody = z.object({
  general: generalSchema.default({ pais: 'españa' }),
  datos: z.unknown(),
}).strict();

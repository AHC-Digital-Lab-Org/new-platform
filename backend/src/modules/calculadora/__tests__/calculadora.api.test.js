import { afterAll, beforeAll, describe, expect, test } from 'vitest';
import { createApp } from '../../../app.js';

let server;
let base;

beforeAll(async () => {
  server = createApp().listen(0);
  await new Promise((resolve) => server.once('listening', resolve));
  base = `http://localhost:${server.address().port}/api/calculadora`;
});

afterAll(() => server.close());

const post = (ruta, body) => fetch(`${base}${ruta}`, {
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify(body),
});

const entradaCompleta = {
  general: { pais: 'españa' },
  vivienda: { personas: 2, consumos: { electricidad: { valor: 3000, unidad: 'kWh_anual' } } },
  transporte: { coche: { km: 8000, energia: 'gasolina', consumo: 6.5 } },
  vuelos: { viajes: [{ tramos: [{ modo: 'aeropuertos', origen: 'mad', destino: 'BCN' }] }] },
  productos: { gastos: { comida_bebida: { importe: 250, frecuencia: 'mensual' } } },
};

describe('POST /calculadora/calcular', () => {
  test('devuelve el total como suma de los módulos, con comparación, planetas y gestos', async () => {
    const res = await post('/calcular', entradaCompleta);
    expect(res.status).toBe(200);
    const body = await res.json();
    const suma = Object.values(body.modulos).reduce((total, modulo) => total + modulo.totalKg, 0);
    expect(body.modulosCalculados).toEqual(['vivienda', 'transporte', 'vuelos', 'productos']);
    expect(body.totalKg).toBeCloseTo(suma);
    expect(body.factorElectrico.origen).toBe('nacional');
    expect(body.comparacion.pais).toBe('España');
    expect(body.planetas.valor).toBeCloseTo(body.totalKg / 2500);
    expect(body.gestos.map(({ id }) => id)).toContain('compartir-coche');
    expect(body.gestos.every(({ ahorroKg }) => ahorroKg > 0)).toBe(true);
  });

  test('un país sin datos usa el factor eléctrico de respaldo y no compara', async () => {
    const body = await (await post('/calcular', { ...entradaCompleta, general: { pais: 'atlantida' } })).json();
    expect(body.factorElectrico.origen).toBe('respaldo');
    expect(body.comparacion).toBeNull();
  });

  test('rechaza propiedades desconocidas (esquema estricto)', async () => {
    const res = await post('/calcular', { ...entradaCompleta, extra: true });
    expect(res.status).toBe(400);
    expect((await res.json()).error.code).toBe('VALIDATION_ERROR');
  });

  test('rechaza valores negativos y unidades que no corresponden a la fuente', async () => {
    const res = await post('/calcular', {
      vivienda: { personas: 1, consumos: { electricidad: { valor: -5, unidad: 'm3_anual' } } },
    });
    expect(res.status).toBe(400);
    const paths = (await res.json()).error.details.map(({ path }) => path);
    expect(paths).toEqual(expect.arrayContaining(['body.vivienda.consumos.electricidad.valor', 'body.vivienda.consumos.electricidad.unidad']));
  });

  test('exige los datos del modo térmico en un híbrido enchufable', async () => {
    const res = await post('/calcular', { transporte: { coche: { km: 100, energia: 'hibrido_enchufable', consumo: 18 } } });
    expect(res.status).toBe(400);
    expect((await res.json()).error.details[0].path).toBe('body.transporte.coche.enchufable');
  });

  test('un aeropuerto desconocido es un error de validación con su ruta', async () => {
    const res = await post('/calcular', { vuelos: { viajes: [{ tramos: [{ modo: 'aeropuertos', origen: 'MAD', destino: 'ZZZ' }] }] } });
    expect(res.status).toBe(400);
    expect((await res.json()).error.details[0].path).toBe('body.vuelos.viajes.0.tramos.0.destino');
  });
});

describe('POST /calculadora/calcular/:modulo', () => {
  test('calcula solo el módulo indicado', async () => {
    const res = await post('/calcular/transporte', { datos: { moto: { km: 1000, tipo: 'moto_pequena' } } });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.modulo).toBe('transporte');
    expect(body.totalKg).toBeCloseTo(83.19);
  });

  test('valida los datos con el esquema del módulo de la ruta', async () => {
    const res = await post('/calcular/vivienda', { datos: { personas: 0 } });
    expect(res.status).toBe(400);
    expect((await res.json()).error.details[0].path).toBe('body.datos.personas');
  });

  test('rechaza un módulo desconocido', async () => {
    const res = await post('/calcular/mascotas', { datos: {} });
    expect(res.status).toBe(400);
    expect((await res.json()).error.details[0].path).toBe('params.modulo');
  });
});

describe('GET /calculadora/factores', () => {
  test('devuelve los catálogos que necesita el formulario', async () => {
    const res = await fetch(`${base}/factores`);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.paises.find(({ id }) => id === 'españa').nombre).toBe('España');
    expect(body.vuelos.aeropuertos.some(({ codigo }) => codigo === 'MAD')).toBe(true);
    expect(body.productos.categorias.find(({ id }) => id === 'computadoras')).toMatchObject({ tipo: 'duradero', vidaUtilPorDefecto: 4 });
  });

  test('limita las peticiones por IP con un 429', async () => {
    process.env.RATE_LIMIT_IN_TEST = 'true';
    try {
      const estados = [];
      for (let i = 0; i < 121; i += 1) estados.push((await fetch(`${base}/factores`)).status);
      expect(estados.slice(0, 120).every((estado) => estado === 200)).toBe(true);
      expect(estados.at(-1)).toBe(429);
    } finally {
      delete process.env.RATE_LIMIT_IN_TEST;
    }
  });

  test('las rutas aparecen en la especificación OpenAPI', async () => {
    const spec = await (await fetch(`${base.replace('/calculadora', '')}/docs.json`)).json();
    expect(spec.paths).toHaveProperty(['/calculadora/calcular']);
    expect(spec.paths).toHaveProperty(['/calculadora/calcular/{modulo}']);
    expect(spec.paths).toHaveProperty(['/calculadora/factores']);
  });
});

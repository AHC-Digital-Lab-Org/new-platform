import { readFileSync } from 'node:fs';
import { ValidationError } from '#shared/errors/index.js';
import { calcularVivienda, FUENTES_VIVIENDA } from './modulos/vivienda.js';
import { calcularTransporte, MODOS_PUBLICOS, TIPOS_TREN } from './modulos/transporte.js';
import { calcularVuelos, CLASES_VUELO, ITINERARIOS_VUELO } from './modulos/vuelos.js';
import { calcularProductos, CATEGORIAS_PRODUCTOS, FRECUENCIAS } from './modulos/productos.js';

const leerDatos = (archivo) => JSON.parse(readFileSync(new URL(`./data/${archivo}`, import.meta.url), 'utf8'));

const factores = leerDatos('reference_factors.json');
const electricidadPaises = leerDatos('electricity_country_factors.json');
const referenciasNacionales = leerDatos('national_emissions_references.json');
const vehiculos = leerDatos('vehiculos.json');
const aeropuertos = leerDatos('vuelos.json');
const aeropuertosPorCodigo = new Map(aeropuertos.map((aeropuerto) => [aeropuerto.codigo, aeropuerto]));

const CALCULOS = {
  vivienda: calcularVivienda,
  transporte: calcularTransporte,
  vuelos: calcularVuelos,
  productos: calcularProductos,
};

export const MODULOS = Object.keys(CALCULOS);

const INCERTIDUMBRE_FACTOR_PERSONALIZADO = 0.15;

// Factor de red del país (Ember) o el de MITECO como respaldo. El personalizado solo sustituye al
// consumo eléctrico; los excedentes fotovoltaicos siguen usando el de red, como en la calculadora AHC.
export const resolverFactorElectrico = ({ pais, factorElectricoPersonalizado }) => {
  const base = factores.vivienda.factores.electricidad;
  const datoPais = electricidadPaises.countries[pais];
  const red = datoPais
    ? {
      valor: datoPais.kgCO2e_kWh,
      incertidumbreRelativa: base.incertidumbre_relativa_factor,
      origen: 'nacional',
      fuente: `${datoPais.fuente} (${datoPais.anio})`,
    }
    : { valor: base.valor, incertidumbreRelativa: base.incertidumbre_relativa_factor, origen: 'respaldo', fuente: base.fuente_id };

  const aplicado = factorElectricoPersonalizado === undefined
    ? red
    : {
      valor: factorElectricoPersonalizado,
      incertidumbreRelativa: INCERTIDUMBRE_FACTOR_PERSONALIZADO,
      origen: 'personalizado',
      fuente: 'Factor indicado por la persona usuaria',
    };
  return { aplicado, red };
};

const crearContexto = (general) => {
  const { aplicado, red } = resolverFactorElectrico(general);
  return {
    factores,
    vehiculos,
    factorElectrico: aplicado,
    factorElectricoRed: red,
    aeropuertoPorCodigo: (codigo) => aeropuertosPorCodigo.get(codigo),
  };
};

const comprobarAeropuertos = (vuelos, ruta) => {
  const desconocidos = (vuelos.viajes ?? []).flatMap((viaje, iViaje) => viaje.tramos.flatMap((tramo, iTramo) => (
    tramo.modo !== 'aeropuertos'
      ? []
      : ['origen', 'destino']
        .filter((extremo) => !aeropuertosPorCodigo.has(tramo[extremo]))
        .map((extremo) => ({
          path: `${ruta}.viajes.${iViaje}.tramos.${iTramo}.${extremo}`,
          message: `Aeropuerto no disponible: ${tramo[extremo]}`,
        }))
  )));
  if (desconocidos.length) throw new ValidationError(desconocidos);
};

export const calcularModulo = (modulo, datos, general, ruta = `body.${modulo}`) => {
  if (modulo === 'vuelos') comprobarAeropuertos(datos, ruta);
  return CALCULOS[modulo](datos, crearContexto(general));
};

const compararConReferenciaNacional = (pais, totalKg) => {
  const referencia = referenciasNacionales.countries[pais];
  if (!referencia) return null;
  const referenciaKg = referencia.tCO2_persona_anio * 1000;
  return {
    pais: referencia.nombre_es,
    referenciaKg,
    anio: referencia.anio,
    proporcion: referenciaKg > 0 ? totalKg / referenciaKg : null,
    fuente: referencia.fuente,
    nota: referencia.nota,
  };
};

const calcularPlanetas = (totalKg) => {
  const presupuesto = factores.indicador_planetas.presupuesto_kgCO2e_persona_anio;
  return { valor: totalKg / presupuesto.valor, presupuestoKg: presupuesto.valor, fuente: presupuesto.fuente };
};

// Pequeños gestos: se recalcula el módulo con un cambio sencillo y realista en los datos de la persona.
// Solo se proponen los que ahorran algo con sus propios datos; el ahorro sale de la misma metodología.
const GESTOS = [
  {
    id: 'compartir-coche',
    modulo: 'transporte',
    titulo: 'Comparte el coche en tus trayectos habituales',
    descripcion: 'Ir con una persona más en el coche reparte las emisiones de cada trayecto.',
    aplica: (datos) => datos.coche?.km > 0,
    transformar: (datos) => ({ ...datos, coche: { ...datos.coche, ocupacion: datos.coche.ocupacion + 1 } }),
  },
  {
    id: 'coche-a-transporte-publico',
    modulo: 'transporte',
    titulo: 'Cambia 1 de cada 4 km en coche por tren o autobús',
    descripcion: 'Elige el transporte público para algunos trayectos de la semana.',
    aplica: (datos) => datos.coche?.km > 0,
    transformar: (datos) => {
      const kmCambiados = datos.coche.km * 0.25;
      const publico = datos.publico ?? {};
      return {
        ...datos,
        coche: { ...datos.coche, km: datos.coche.km - kmCambiados },
        publico: { ...publico, autocar_interurbano: (publico.autocar_interurbano ?? 0) + kmCambiados },
      };
    },
  },
  {
    id: 'vuelos-cortos-en-tren',
    modulo: 'vuelos',
    titulo: 'Haz en tren los viajes de menos de 1.000 km',
    descripcion: 'Para distancias cortas, el tren emite mucho menos por persona que el avión.',
    aplica: (datos) => datos.viajes?.length > 0,
    calcularAhorro: (datos, resultado, general) => {
      const cortos = resultado.partidas
        .map((viaje, indice) => ({ viaje, original: datos.viajes[indice] }))
        .filter(({ viaje }) => viaje.detalle.kmPorTrayecto < 1000);
      if (!cortos.length) return 0;
      const kmEnTren = cortos.reduce((suma, { viaje, original }) => (
        suma + viaje.detalle.kmPorTrayecto * factores.vuelos.moduladores[original.itinerario].valor * original.veces
      ), 0);
      const tren = calcularModulo('transporte', { publico: { tren: kmEnTren, tipoTren: 'tren_nacional' } }, general);
      return cortos.reduce((suma, { viaje }) => suma + viaje.kg, 0) - tren.totalKg;
    },
  },
  {
    id: 'menos-carne',
    modulo: 'productos',
    titulo: 'Reduce la carne, sobre todo la roja',
    descripcion: 'Añade más legumbres, verduras y cereales a tu semana.',
    aplica: (datos) => datos.gastos?.comida_bebida?.importe > 0 && !['vegana', 'vegetariana'].includes(datos.dieta),
    transformar: (datos) => ({
      ...datos,
      dieta: datos.dieta === 'omnivoro_alto_carne_roja' ? 'omnivoro_medio' : 'omnivoro_bajo_carne',
    }),
  },
  {
    id: 'alargar-dispositivos',
    modulo: 'productos',
    titulo: 'Alarga 2 años la vida de tu móvil y tu ordenador',
    descripcion: 'Repara antes de cambiar: los equipos nuevos concentran casi toda su huella en la fabricación.',
    aplica: (datos) => datos.gastos?.computadoras?.importe > 0,
    transformar: (datos) => {
      const vidaActual = datos.gastos.computadoras.vidaUtil ?? factores.productos.vida_util_por_defecto_anios.computadoras.valor;
      return { ...datos, gastos: { ...datos.gastos, computadoras: { ...datos.gastos.computadoras, vidaUtil: vidaActual + 2 } } };
    },
  },
  {
    id: 'ropa-segunda-mano',
    modulo: 'productos',
    titulo: 'Compra un 25 % menos de ropa nueva',
    descripcion: 'Segunda mano, intercambio o simplemente cuidar lo que ya tienes.',
    aplica: (datos) => datos.gastos?.ropa_textiles_calzado?.importe > 0,
    transformar: (datos) => {
      const ropa = datos.gastos.ropa_textiles_calzado;
      return { ...datos, gastos: { ...datos.gastos, ropa_textiles_calzado: { ...ropa, importe: ropa.importe * 0.75 } } };
    },
  },
  {
    id: 'ahorrar-electricidad',
    modulo: 'vivienda',
    titulo: 'Ahorra un 10 % de electricidad en casa',
    descripcion: 'Apaga los aparatos en espera, usa programas eco y aprovecha la luz natural.',
    aplica: (datos) => datos.consumos?.electricidad?.valor > 0,
    transformar: (datos) => {
      const electricidad = datos.consumos.electricidad;
      return { ...datos, consumos: { ...datos.consumos, electricidad: { ...electricidad, valor: electricidad.valor * 0.9 } } };
    },
  },
  {
    id: 'ajustar-calefaccion',
    modulo: 'vivienda',
    titulo: 'Ahorra un 10 % de calefacción',
    descripcion: 'Baja un grado el termostato, cierra persianas por la noche y ventila 10 minutos.',
    aplica: (datos) => ['gas', 'gasoleo', 'glp', 'propano', 'carbon'].some((fuente) => datos.consumos?.[fuente]?.valor > 0),
    transformar: (datos) => ({
      ...datos,
      consumos: Object.fromEntries(Object.entries(datos.consumos).map(([fuente, consumo]) => [
        fuente,
        fuente === 'electricidad' || fuente === 'pellets' || !consumo ? consumo : { ...consumo, valor: consumo.valor * 0.9 },
      ])),
    }),
  },
];

const calcularGestos = (entrada, resultados, general) => GESTOS
  .filter((gesto) => entrada[gesto.modulo] && gesto.aplica(entrada[gesto.modulo]))
  .map((gesto) => {
    const datos = entrada[gesto.modulo];
    const actual = resultados[gesto.modulo];
    const ahorroKg = gesto.calcularAhorro
      ? gesto.calcularAhorro(datos, actual, general)
      : actual.totalKg - calcularModulo(gesto.modulo, gesto.transformar(datos), general).totalKg;
    return { id: gesto.id, modulo: gesto.modulo, titulo: gesto.titulo, descripcion: gesto.descripcion, ahorroKg };
  })
  .filter((gesto) => gesto.ahorroKg >= 1)
  .sort((a, b) => b.ahorroKg - a.ahorroKg);

/** Calcula todos los módulos enviados, el total, la comparación nacional, los planetas y los gestos. */
export const calcularHuella = (entrada) => {
  const { general } = entrada;
  const resultados = Object.fromEntries(MODULOS
    .filter((modulo) => entrada[modulo])
    .map((modulo) => [modulo, calcularModulo(modulo, entrada[modulo], general)]));

  const calculados = Object.values(resultados);
  const totalKg = calculados.reduce((suma, resultado) => suma + resultado.totalKg, 0);
  const incertidumbreKg = Math.sqrt(calculados.reduce((suma, resultado) => suma + resultado.incertidumbreKg ** 2, 0));
  const compensacionFotovoltaicaKg = resultados.vivienda?.compensacionFotovoltaicaKg ?? 0;

  return {
    modulos: resultados,
    modulosCalculados: Object.keys(resultados),
    totalKg,
    incertidumbreKg,
    compensacionFotovoltaicaKg,
    netoOrientativoKg: Math.max(0, totalKg - compensacionFotovoltaicaKg),
    factorElectrico: resolverFactorElectrico(general).aplicado,
    comparacion: compararConReferenciaNacional(general.pais, totalKg),
    planetas: calcularPlanetas(totalKg),
    gestos: calcularGestos(entrada, resultados, general),
  };
};

const opciones = (objeto) => Object.entries(objeto).map(([id, etiqueta]) => ({ id, etiqueta }));

/** Catálogos y valores de ayuda que necesita el formulario (sin lógica de cálculo). */
export const obtenerCatalogo = () => ({
  paises: Object.values(electricidadPaises.countries)
    .map(({ selector_value: id, nombre_es: nombre }) => ({ id, nombre }))
    .sort((a, b) => a.nombre.localeCompare(b.nombre, 'es')),
  paisPorDefecto: 'españa',
  vivienda: {
    fuentes: Object.entries(FUENTES_VIVIENDA).map(([id, { etiqueta, unidades }]) => ({ id, etiqueta, unidades: Object.keys(unidades) })),
  },
  transporte: {
    energias: vehiculos.coches.energias.map(({ id, etiqueta, tipo, unidad, consumo_orientativo: consumoOrientativo, consumo_maximo: consumoMaximo }) => (
      { id, etiqueta, tipo, unidad, consumoOrientativo, consumoMaximo }
    )),
    combustiblesEnchufable: vehiculos.coches.combustibles_termicos_enchufable
      .map(({ id, etiqueta, consumo_orientativo: consumoOrientativo }) => ({ id, etiqueta, consumoOrientativo })),
    motos: vehiculos.motos.tipos,
    modosPublicos: opciones(MODOS_PUBLICOS),
    tiposTren: opciones(TIPOS_TREN),
  },
  vuelos: {
    aeropuertos: aeropuertos.map(({ codigo, nombre, ciudad, pais }) => ({ codigo, nombre, ciudad, pais })),
    clases: opciones(CLASES_VUELO),
    itinerarios: opciones(ITINERARIOS_VUELO),
    multiplicadorNoCo2: factores.vuelos.moduladores.forzamiento_radiativo.valor,
  },
  productos: {
    categorias: CATEGORIAS_PRODUCTOS.map((categoria) => ({
      ...categoria,
      tipo: factores.productos.factores[categoria.id].tipo === 'producto_duradero' ? 'duradero' : 'recurrente',
      vidaUtilPorDefecto: factores.productos.vida_util_por_defecto_anios[categoria.id]?.valor,
    })),
    frecuencias: opciones(FRECUENCIAS),
    dietas: Object.entries(factores.productos.moduladores_dieta_alimentaria.opciones)
      .map(([id, { etiqueta }]) => ({ id, etiqueta: etiqueta ?? 'Omnívoro con alto consumo de carne, especialmente roja' })),
  },
  planetas: { presupuestoKg: factores.indicador_planetas.presupuesto_kgCO2e_persona_anio.valor },
  fuentes: {
    factores: { version: factores.metadata.schema_version, actualizacion: factores.metadata.ultima_actualizacion },
    electricidad: electricidadPaises.metadata.fuente_principal,
    referenciasNacionales: referenciasNacionales.metadata.fuente_principal,
    planetas: factores.indicador_planetas.presupuesto_kgCO2e_persona_anio.fuente,
  },
});

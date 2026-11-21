import { crearPartida, incertidumbreDato, sumarPartidas } from './incertidumbre.js';

export const MODOS_PUBLICOS = {
  bus_urbano: 'Autobús urbano',
  autocar_interurbano: 'Autocar o autobús interurbano',
  tren: 'Tren',
  tranvia: 'Tranvía',
  metro: 'Metro',
  taxi_vtc: 'Taxi o VTC',
};

export const TIPOS_TREN = {
  tren_nacional: 'No lo sé / tren nacional medio',
  tren_electrico_alta_velocidad: 'Eléctrico o alta velocidad',
  tren_diesel: 'Diésel o línea no electrificada',
};

const porcentajeIncluidoEnVivienda = ({ cargaIncluidaVivienda = 'no', porcentajeCargaIncluida = 0 }) => {
  if (cargaIncluidaVivienda === 'si') return 100;
  if (cargaIncluidaVivienda === 'parcial') return porcentajeCargaIncluida;
  return 0;
};

// Parte eléctrica (coche eléctrico o modo eléctrico del enchufable): kWh de red estimados y
// descontando la carga que ya está declarada en Vivienda para no contarla dos veces.
const emisionesElectricas = ({ km, coche, factores, factorElectrico, relativasBase }) => {
  const ajuste = factores.transporte.coche.parametros.ajustes_perdidas_carga_electrica[coche.origenConsumoElectrico ?? 'no_se'];
  const kWhRed = (km * coche.consumo) / 100 * ajuste.valor;
  const fraccionSumada = 1 - porcentajeIncluidoEnVivienda(coche) / 100;
  return {
    kg: (kWhRed * fraccionSumada * factorElectrico.valor) / coche.ocupacion,
    relativas: [...relativasBase, ajuste.incertidumbre_relativa_ajuste, factorElectrico.incertidumbreRelativa],
  };
};

/** Huella anual personal del coche: consumo real × factor de la energía, repartido por ocupación media. */
export function calcularCoche(coche, { factores, factorElectrico, vehiculos }) {
  const energia = vehiculos.coches.energias.find(({ id }) => id === coche.energia);
  const factoresCoche = factores.transporte.coche.factores;
  const relativaKm = incertidumbreDato(factores, 'kilometros_anuales');
  const relativaConsumo = incertidumbreDato(factores, 'consumo_estimado');
  const etiqueta = `Coche (${energia.etiqueta.toLowerCase()})`;

  if (energia.tipo === 'liquido') {
    const factor = factoresCoche[energia.factor];
    const litros = (coche.km * coche.consumo) / 100;
    return [crearPartida({
      id: 'coche',
      etiqueta,
      kg: (litros * factor.valor) / coche.ocupacion,
      relativas: [relativaKm, relativaConsumo, factor.incertidumbre_relativa_factor],
    })];
  }

  if (energia.tipo === 'electrico') {
    const { kg, relativas } = emisionesElectricas({
      km: coche.km, coche, factores, factorElectrico, relativasBase: [relativaKm, relativaConsumo],
    });
    return [crearPartida({ id: 'coche', etiqueta, kg, relativas })];
  }

  const { combustibleTermico, porcentajeKmElectrico, consumoCombustible } = coche.enchufable;
  const relativaPorcentaje = factores.transporte.coche.parametros.incertidumbre_porcentaje_km_electrico_phev.valor;
  const kmElectricos = (coche.km * porcentajeKmElectrico) / 100;
  const factorTermico = factoresCoche[combustibleTermico];
  const electrica = emisionesElectricas({
    km: kmElectricos, coche, factores, factorElectrico, relativasBase: [relativaKm, relativaConsumo, relativaPorcentaje],
  });
  const kmTermicos = coche.km - kmElectricos;
  return [
    crearPartida({ id: 'coche_electrico', etiqueta: 'Coche enchufable (modo eléctrico)', ...electrica }),
    crearPartida({
      id: 'coche_termico',
      etiqueta: 'Coche enchufable (motor térmico)',
      kg: ((kmTermicos * consumoCombustible) / 100 * factorTermico.valor) / coche.ocupacion,
      relativas: [relativaKm, relativaConsumo, relativaPorcentaje, factorTermico.incertidumbre_relativa_factor],
    }),
  ];
}

/** Huella anual de la moto: km × factor medio por tipo (sin ocupación, como en la calculadora AHC). */
export function calcularMoto(moto, { factores, vehiculos }) {
  const factor = factores.transporte.moto.factores[moto.tipo];
  const tipo = vehiculos.motos.tipos.find(({ id }) => id === moto.tipo);
  return [crearPartida({
    id: 'moto',
    etiqueta: `Moto (${tipo.etiqueta.split(' (')[0].toLowerCase()})`,
    kg: moto.km * factor.valor,
    relativas: [incertidumbreDato(factores, 'kilometros_anuales'), factor.incertidumbre_relativa_factor],
  })];
}

/** Huella anual de bus, autocar, tren, tranvía, metro y taxi: pasajero-km × factor por modo. */
export function calcularPublico(publico, { factores }) {
  const factoresModos = factores.transporte.bus_tren.factores;
  const relativaKm = incertidumbreDato(factores, 'kilometros_anuales');
  return Object.keys(MODOS_PUBLICOS)
    .filter((modo) => publico[modo] > 0)
    .map((modo) => {
      const factor = factoresModos[modo === 'tren' ? publico.tipoTren ?? 'tren_nacional' : modo];
      return crearPartida({
        id: modo,
        etiqueta: MODOS_PUBLICOS[modo],
        kg: publico[modo] * factor.valor,
        relativas: [relativaKm, factor.incertidumbre_relativa_factor],
      });
    });
}

export function calcularTransporte(entrada, contexto) {
  const partidas = [
    ...(entrada.coche?.km > 0 ? calcularCoche(entrada.coche, contexto) : []),
    ...(entrada.moto?.km > 0 ? calcularMoto(entrada.moto, contexto) : []),
    ...(entrada.publico ? calcularPublico(entrada.publico, contexto) : []),
  ];
  return { modulo: 'transporte', ...sumarPartidas(partidas), partidas };
}

import { combinarRelativas, incertidumbreDato, sumarPartidas } from './incertidumbre.js';

export const CLASES_VUELO = {
  economica: 'Turista',
  premium_economy: 'Turista premium',
  business: 'Business',
  primera: 'Primera',
};

export const ITINERARIOS_VUELO = { ida_y_vuelta: 'Ida y vuelta', solo_ida: 'Solo ida' };

const RADIO_TIERRA_KM = 6371;

export const haversineKm = (origen, destino) => {
  const aRadianes = (grados) => (grados * Math.PI) / 180;
  const dLat = aRadianes(destino.lat - origen.lat);
  const dLon = aRadianes(destino.lon - origen.lon);
  const a = Math.sin(dLat / 2) ** 2
    + Math.cos(aRadianes(origen.lat)) * Math.cos(aRadianes(destino.lat)) * Math.sin(dLon / 2) ** 2;
  return 2 * RADIO_TIERRA_KM * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

export const seleccionarTramoDistancia = (km, factoresPorDistancia) => {
  const entradas = Object.entries(factoresPorDistancia);
  const encontrado = entradas.find(([, bin]) => km >= (bin.min_km ?? 0) && km < (bin.max_km ?? Infinity));
  const [id, factor] = encontrado ?? entradas.at(-1);
  return { id, factor };
};

// Devuelve la distancia del tramo y su incertidumbre relativa según cómo se haya indicado.
const distanciaTramo = (tramo, { factores, aeropuertoPorCodigo }) => {
  const { parametros } = factores.vuelos;
  if (tramo.modo === 'aeropuertos') {
    const km = haversineKm(aeropuertoPorCodigo(tramo.origen), aeropuertoPorCodigo(tramo.destino));
    return { km, relativa: km > 0 ? parametros.incertidumbre_aeropuerto_iata_km.valor / km : 0 };
  }
  if (tramo.modo === 'horas') {
    const velocidad = parametros.velocidad_media_km_h;
    return {
      km: tramo.horas * velocidad.valor,
      relativa: combinarRelativas([incertidumbreDato(factores, 'horas_vuelo_estimadas'), velocidad.incertidumbre_relativa_factor]),
    };
  }
  return { km: tramo.km, relativa: incertidumbreDato(factores, 'distancia_vuelo_manual_km') };
};

/**
 * Huella anual de vuelos: E_tramo = km × FE_distancia × clase × itinerario × veces.
 * Siempre se calculan las dos lecturas; la ampliada aplica una sola vez el multiplicador no-CO₂.
 */
export function calcularVuelos(entrada, contexto) {
  const { factores } = contexto;
  const { factores_por_distancia: factoresPorDistancia, moduladores, moduladores_clase_por_distancia: clases } = factores.vuelos;
  const criterio = entrada.criterio ?? 'ampliado';
  const noCo2 = moduladores.forzamiento_radiativo;

  const viajes = (entrada.viajes ?? []).map((viaje, indice) => {
    const itinerario = moduladores[viaje.itinerario];
    const repeticiones = itinerario.valor * viaje.veces;
    const tramos = viaje.tramos.map((tramo) => {
      const distancia = distanciaTramo(tramo, contexto);
      const bin = seleccionarTramoDistancia(distancia.km, factoresPorDistancia);
      const clase = clases[viaje.clase][bin.id] ?? clases[viaje.clase].default;
      const directoKg = distancia.km * bin.factor.valor * clase.valor * repeticiones;
      const relativaDirecta = combinarRelativas([distancia.relativa, bin.factor.incertidumbre_relativa_factor, clase.incertidumbre_relativa_factor]);
      return { km: distancia.km, distancia: bin.id, directoKg, relativaDirecta };
    });
    const directoKg = tramos.reduce((suma, tramo) => suma + tramo.directoKg, 0);
    const incertidumbreDirectaKg = Math.sqrt(tramos.reduce((suma, t) => suma + (t.directoKg * t.relativaDirecta) ** 2, 0));
    const ampliadoKg = directoKg * noCo2.valor;
    const incertidumbreAmpliadaKg = Math.sqrt(tramos.reduce(
      (suma, t) => suma + (t.directoKg * noCo2.valor * combinarRelativas([t.relativaDirecta, noCo2.incertidumbre_relativa_factor])) ** 2,
      0,
    ));
    const usaAmpliado = criterio === 'ampliado';
    return {
      id: `viaje_${indice + 1}`,
      etiqueta: `Viaje ${indice + 1}`,
      kg: usaAmpliado ? ampliadoKg : directoKg,
      incertidumbreKg: usaAmpliado ? incertidumbreAmpliadaKg : incertidumbreDirectaKg,
      detalle: {
        kmPorTrayecto: tramos.reduce((suma, tramo) => suma + tramo.km, 0),
        tramos: tramos.map(({ km, distancia }) => ({ km, distancia })),
        directoKg,
        ampliadoKg,
      },
    };
  });

  return {
    modulo: 'vuelos',
    criterio,
    ...sumarPartidas(viajes),
    directoKg: viajes.reduce((suma, viaje) => suma + viaje.detalle.directoKg, 0),
    ampliadoKg: viajes.reduce((suma, viaje) => suma + viaje.detalle.ampliadoKg, 0),
    partidas: viajes,
  };
}

import { crearPartida, incertidumbreDato, sumarPartidas } from './incertidumbre.js';

// Unidad interna = la del factor de emisión; las demás se convierten antes (reference_factors.json → vivienda.conversiones).
export const FUENTES_VIVIENDA = {
  electricidad: { etiqueta: 'Electricidad', unidades: { kWh_anual: null } },
  gas: { etiqueta: 'Gas natural', unidades: { kWh_anual: null, m3_anual: 'gas_natural_m3_a_kwh' } },
  gasoleo: { etiqueta: 'Gasóleo de calefacción', unidades: { litros_anual: null } },
  glp: { etiqueta: 'GLP', unidades: { litros_anual: null, kg_anual: 'glp_kg_a_litro' } },
  propano: { etiqueta: 'Propano', unidades: { kg_anual: null, litros_anual: 'propano_litro_a_kg' } },
  pellets: { etiqueta: 'Pellets de madera', unidades: { kg_anual: null, toneladas_anual: 'tonelada_a_kg' } },
  carbon: { etiqueta: 'Carbón', unidades: { kg_anual: null, toneladas_anual: 'tonelada_a_kg' } },
};

const convertir = (fuente, { valor, unidad }, conversiones) => {
  const claveConversion = FUENTES_VIVIENDA[fuente].unidades[unidad];
  if (!claveConversion) return { cantidad: valor, relativaConversion: 0 };
  const conversion = conversiones[claveConversion];
  return { cantidad: valor * conversion.valor, relativaConversion: conversion.incertidumbre_relativa_conversion ?? 0 };
};

/**
 * Huella anual personal de la vivienda habitual: consumo del hogar × factor, repartido entre residentes.
 * La electricidad usa el factor eléctrico activo (nacional, fallback o personalizado) y los excedentes
 * fotovoltaicos se calculan aparte, con el factor medio de red, como compensación orientativa.
 */
export function calcularVivienda(entrada, { factores, factorElectrico, factorElectricoRed }) {
  const { personas, consumos = {}, origenDato = 'factura', excedenteFotovoltaicoKWh = 0 } = entrada;
  const { factores: factoresVivienda, conversiones, compensaciones } = factores.vivienda;
  const relativaDato = incertidumbreDato(factores, origenDato === 'estimado' ? 'consumo_estimado' : 'consumo_factura_o_medidor');

  const partidasHogar = Object.entries(consumos)
    .filter(([, consumo]) => consumo && consumo.valor > 0)
    .map(([fuente, consumo]) => {
      const { cantidad, relativaConversion } = convertir(fuente, consumo, conversiones);
      const factor = fuente === 'electricidad'
        ? { valor: factorElectrico.valor, relativa: factorElectrico.incertidumbreRelativa }
        : { valor: factoresVivienda[fuente].valor, relativa: factoresVivienda[fuente].incertidumbre_relativa_factor };
      return crearPartida({
        id: fuente,
        etiqueta: FUENTES_VIVIENDA[fuente].etiqueta,
        kg: cantidad * factor.valor,
        relativas: [relativaDato, relativaConversion, factor.relativa],
      });
    });

  const partidas = partidasHogar.map((partida) => ({
    ...partida,
    kg: partida.kg / personas,
    incertidumbreKg: partida.incertidumbreKg / personas,
  }));
  const { totalKg, incertidumbreKg } = sumarPartidas(partidas);

  const compensacion = crearPartida({
    id: 'fotovoltaica',
    etiqueta: 'Excedente fotovoltaico vertido a la red',
    kg: (excedenteFotovoltaicoKWh * factorElectricoRed.valor) / personas,
    relativas: [
      incertidumbreDato(factores, 'consumo_factura_o_medidor'),
      compensaciones.fotovoltaica_excedente_red.factor_evitable_electricidad.incertidumbre_relativa_factor,
    ],
  });

  return {
    modulo: 'vivienda',
    totalKg,
    incertidumbreKg,
    partidas,
    hogarKg: totalKg * personas,
    personas,
    compensacionFotovoltaicaKg: compensacion.kg,
    compensacionFotovoltaicaIncertidumbreKg: compensacion.incertidumbreKg,
    netoOrientativoKg: Math.max(0, totalKg - compensacion.kg),
  };
}

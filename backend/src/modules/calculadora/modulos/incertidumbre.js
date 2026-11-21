// Propagación de incertidumbre de la calculadora AHC (reference_factors.json → convenciones.incertidumbre):
// producto E = A · FE → σ_rel = √(Σ σ_rel²); suma T = Σ Ei → σ_T = √(Σ σ_Ei²).
export const combinarRelativas = (relativas) =>
  Math.sqrt(relativas.reduce((suma, relativa) => suma + (Number(relativa) || 0) ** 2, 0));

export const crearPartida = ({ id, etiqueta, kg, relativas = [], detalle }) => ({
  id,
  etiqueta,
  kg,
  incertidumbreKg: Math.abs(kg) * combinarRelativas(relativas),
  ...(detalle ? { detalle } : {}),
});

export const sumarPartidas = (partidas) => ({
  totalKg: partidas.reduce((suma, partida) => suma + partida.kg, 0),
  incertidumbreKg: Math.sqrt(partidas.reduce((suma, partida) => suma + partida.incertidumbreKg ** 2, 0)),
});

export const incertidumbreDato = (factores, clave) => factores.incertidumbres_dato_usuario[clave].valor;

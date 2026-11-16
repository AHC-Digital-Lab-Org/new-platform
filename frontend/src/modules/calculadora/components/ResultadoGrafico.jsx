import { useId } from 'react';

export const MODULOS_RESULTADO = [
  { id: 'vivienda', etiqueta: 'Vivienda', color: 'var(--c-tierra)' },
  { id: 'transporte', etiqueta: 'Transporte', color: 'var(--c-agua)' },
  { id: 'vuelos', etiqueta: 'Vuelos', color: 'var(--c-ciruela)' },
  { id: 'productos', etiqueta: 'Consumo', color: 'var(--c-hoja)' },
];

export const formatearToneladas = (kg, decimales = 1) =>
  (kg / 1000).toLocaleString('es-ES', { minimumFractionDigits: decimales, maximumFractionDigits: decimales });

export const formatearKg = (kg) =>
  Math.round(kg).toLocaleString('es-ES', { useGrouping: true });

const MAXIMO_PLANETAS = 8;

function Planeta({ fraccion = 1, indice }) {
  const id = useId();
  return (
    <svg viewBox="0 0 64 64" className="size-12 sm:size-14" aria-hidden="true" style={{ '--retraso': `${indice * 90}ms` }}>
      <defs>
        <clipPath id={`${id}-recorte`}>
          <rect x="0" y="0" width={64 * fraccion} height="64" />
        </clipPath>
      </defs>
      <circle cx="32" cy="32" r="29" fill="none" stroke="var(--c-linea)" strokeWidth="2" strokeDasharray="3 4" />
      <g clipPath={`url(#${id}-recorte)`}>
        <circle cx="32" cy="32" r="29" fill="var(--c-agua)" />
        <path d="M14 20c6-6 14-6 16-1s-4 7-1 11-6 9-11 5-10-9-4-15zM38 12c7 1 15 7 16 15-5 1-7-4-11-2s-1 7-6 7-6-6-3-11 0-8 4-9zM34 44c5-3 12-3 14 1s-4 9-9 9-9-6-5-10z" fill="var(--c-hoja)" />
      </g>
    </svg>
  );
}

/** Fila de planetas: cuántos planetas harían falta si todo el mundo tuviera esta huella. */
export function Planetas({ valor }) {
  const enteros = Math.floor(valor);
  const resto = valor - enteros;
  const cantidad = Math.min(MAXIMO_PLANETAS, Math.max(1, Math.ceil(valor)));
  const fracciones = Array.from({ length: cantidad }, (_, indice) => (indice < enteros ? 1 : resto || 1));

  return (
    <div>
      <div className="flex flex-wrap gap-1.5" role="img" aria-label={`${valor.toLocaleString('es-ES', { maximumFractionDigits: 1 })} planetas`}>
        {fracciones.map((fraccion, indice) => <Planeta key={indice} indice={indice} fraccion={fraccion} />)}
        {valor > MAXIMO_PLANETAS && <span className="cifra self-center text-lg font-semibold">+{Math.ceil(valor - MAXIMO_PLANETAS)}</span>}
      </div>
    </div>
  );
}

/** Cinta proporcional por apartado y tabla con el detalle (legible también al imprimir). */
export default function ResultadoGrafico({ modulos, totalKg }) {
  const filas = MODULOS_RESULTADO.map((modulo) => ({ ...modulo, resultado: modulos[modulo.id] }));
  const conDatos = filas.filter(({ resultado }) => resultado && resultado.totalKg > 0);

  return (
    <div>
      <div className="flex h-5 overflow-hidden rounded-full bg-(--c-linea)" role="img" aria-label="Reparto de la huella por apartado">
        {conDatos.map(({ id, color, resultado }) => (
          <div key={id} style={{ width: `${(resultado.totalKg / totalKg) * 100}%`, background: color }} className="h-full transition-[width] duration-700 ease-out" />
        ))}
      </div>

      <table className="mt-6 w-full text-left text-sm">
        <caption className="sr-only">Huella por apartado en kg CO₂e al año</caption>
        <thead>
          <tr className="text-(--c-tinta-suave)">
            <th scope="col" className="pb-2 font-medium">Apartado</th>
            <th scope="col" className="pb-2 text-right font-medium">kg CO₂e/año</th>
            <th scope="col" className="pb-2 text-right font-medium">Peso</th>
          </tr>
        </thead>
        <tbody>
          {filas.map(({ id, etiqueta, color, resultado }) => (
            <tr key={id} className="border-t border-(--c-linea)">
              <th scope="row" className="py-2.5 font-medium">
                <span className="mr-2.5 inline-block size-3 rounded-full align-middle" style={{ background: color }} aria-hidden="true" />
                {etiqueta}
              </th>
              <td className="cifra py-2.5 text-right">
                {resultado ? formatearKg(resultado.totalKg) : <span className="text-(--c-tinta-suave)">Sin datos</span>}
              </td>
              <td className="cifra py-2.5 text-right text-(--c-tinta-suave)">
                {resultado && totalKg > 0 ? `${Math.round((resultado.totalKg / totalKg) * 100)} %` : '—'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

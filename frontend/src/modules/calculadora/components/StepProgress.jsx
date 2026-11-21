import { Link, useLocation } from 'react-router';
import { useCalculadora } from '../CalculadoraContext.jsx';
import { IconoPaso } from './Escena.jsx';
import { formatearToneladas } from './ResultadoGrafico.jsx';

export const PASOS = [
  { id: 'bienvenida', ruta: '', etiqueta: 'Inicio' },
  { id: 'vivienda', ruta: 'vivienda', etiqueta: 'Vivienda' },
  { id: 'transporte', ruta: 'transporte', etiqueta: 'Transporte' },
  { id: 'vuelos', ruta: 'vuelos', etiqueta: 'Vuelos' },
  { id: 'productos', ruta: 'productos', etiqueta: 'Consumo' },
  { id: 'resultados', ruta: 'resultados', etiqueta: 'Resultados' },
];

export const indicePasoDeRuta = (pathname) => {
  const ultimo = pathname.replace(/\/+$/, '').split('/').pop();
  const indice = PASOS.findIndex(({ ruta }) => ruta === ultimo);
  return indice === -1 ? 0 : indice;
};

// Rutas absolutas de los pasos a partir de la URL actual, sea cual sea el prefijo del módulo.
export function useRutasPasos() {
  const { pathname } = useLocation();
  const limpio = pathname.replace(/\/+$/, '');
  const ultimo = limpio.split('/').pop();
  const base = PASOS.some(({ ruta }) => ruta && ruta === ultimo) ? limpio.slice(0, -(ultimo.length + 1)) : limpio;
  const rutaDe = (id) => {
    const { ruta } = PASOS.find((paso) => paso.id === id);
    return ruta ? `${base}/${ruta}` : base || '/';
  };
  return { indice: indicePasoDeRuta(pathname), rutaDe };
}

/** Camino de pasos con el total en vivo: la huella crece a medida que se completa cada apartado. */
export default function StepProgress() {
  const { indice: actual, rutaDe } = useRutasPasos();
  const { visitados, totalEnVivoKg } = useCalculadora();
  const avance = actual / (PASOS.length - 1);

  return (
    <nav aria-label="Pasos de la calculadora" className="no-imprimir">
      <div className="flex items-center justify-between gap-4">
        <p className="text-sm text-(--c-tinta-suave)">
          <span className="sr-only">Paso actual: </span>
          Paso {actual + 1} de {PASOS.length} · <span className="font-medium text-(--c-tinta)">{PASOS[actual].etiqueta}</span>
        </p>
        <p className="rounded-full bg-(--c-superficie) px-3.5 py-1.5 text-sm shadow-(--c-sombra)" aria-live="polite">
          Tu huella hasta ahora{' '}
          <strong className="cifra text-base font-semibold text-(--c-bosque)">{formatearToneladas(totalEnVivoKg)}</strong>
          <span className="text-(--c-tinta-suave)"> t CO₂e/año</span>
        </p>
      </div>

      <div className="relative mt-5">
        <svg viewBox="0 0 1000 24" preserveAspectRatio="none" className="absolute inset-x-[calc(100%/12)] top-[18px] h-6 w-[calc(100%-100%/6)]" aria-hidden="true">
          <path d="M0 12 C80 2 160 22 250 12 S420 2 500 12 S670 22 750 12 S920 2 1000 12" fill="none" stroke="var(--c-linea)" strokeWidth="3" strokeDasharray="2 9" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
          <path
            className="sendero-trazo"
            d="M0 12 C80 2 160 22 250 12 S420 2 500 12 S670 22 750 12 S920 2 1000 12"
            fill="none"
            stroke="var(--c-hoja)"
            strokeWidth="3.5"
            strokeLinecap="round"
            pathLength="1"
            strokeDasharray="1"
            strokeDashoffset={1 - avance}
            vectorEffect="non-scaling-stroke"
          />
        </svg>
        <ol className="relative grid grid-cols-6">
          {PASOS.map((paso, indice) => {
            const hecho = indice < actual || visitados.includes(paso.id);
            const esActual = indice === actual;
            return (
              <li key={paso.id} className="flex flex-col items-center">
                <Link
                  to={rutaDe(paso.id)}
                  aria-current={esActual ? 'step' : undefined}
                  className={`flex size-11 items-center justify-center rounded-full border-2 transition-[transform,background-color,border-color] duration-300 ${esActual
                    ? 'scale-110 border-(--c-bosque) bg-(--c-bosque) text-white shadow-[0_8px_18px_-8px_rgb(31_81_55/0.8)]'
                    : hecho
                      ? 'border-(--c-hoja) bg-(--c-brote) text-(--c-bosque) hover:bg-(--c-superficie)'
                      : 'border-(--c-linea) bg-(--c-superficie) text-(--c-tinta-suave) hover:border-(--c-hoja)'}`}
                >
                  <IconoPaso paso={paso.id} />
                  <span className="sr-only">{paso.etiqueta}{hecho && !esActual ? ' (visitado)' : ''}</span>
                </Link>
                <span aria-hidden="true" className={`mt-2 hidden text-xs sm:block ${esActual ? 'font-semibold text-(--c-tinta)' : 'text-(--c-tinta-suave)'}`}>
                  {paso.etiqueta}
                </span>
              </li>
            );
          })}
        </ol>
      </div>
    </nav>
  );
}

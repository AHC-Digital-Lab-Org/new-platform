import { useEffect, useRef } from 'react';
import { Link } from 'react-router';
import { useCalculadora } from '../CalculadoraContext.jsx';
import Escena from './Escena.jsx';
import { formatearKg, formatearToneladas } from './ResultadoGrafico.jsx';
import { PASOS, useRutasPasos } from './StepProgress.jsx';

const claseBoton = 'inline-flex items-center justify-center gap-2 rounded-full px-6 py-3 text-[15px] font-semibold transition-[background-color,transform] duration-200 active:scale-[0.98]';
export const botonPrincipal = `${claseBoton} bg-(--c-bosque) text-white hover:bg-(--c-bosque-hondo)`;
export const botonSecundario = `${claseBoton} border border-(--c-linea) bg-(--c-superficie) text-(--c-tinta) hover:border-(--c-hoja)`;

const Flecha = ({ izquierda = false }) => (
  <svg viewBox="0 0 20 20" className={`size-4 ${izquierda ? 'rotate-180' : ''}`} aria-hidden="true">
    <path d="M4 10h11m-4-5 5 5-5 5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

/** Navegación inferior entre pasos. */
export function NavegacionPasos({ textoSiguiente }) {
  const { indice, rutaDe } = useRutasPasos();
  const anterior = PASOS[indice - 1];
  const siguiente = PASOS[indice + 1];
  return (
    <div className="no-imprimir mt-10 flex flex-wrap items-center justify-between gap-3 border-t border-(--c-linea) pt-6">
      {anterior ? <Link to={rutaDe(anterior.id)} className={botonSecundario}><Flecha izquierda />{anterior.etiqueta}</Link> : <span />}
      {siguiente && (
        <Link to={rutaDe(siguiente.id)} className={botonPrincipal}>
          {textoSiguiente ?? `Siguiente: ${siguiente.etiqueta}`}
          <Flecha />
        </Link>
      )}
    </div>
  );
}

/** Resultado en vivo del apartado: se recalcula en el backend mientras se rellenan los datos. */
function ResultadoApartado({ modulo, nota }) {
  const { resultados, errores } = useCalculadora();
  const resultado = resultados[modulo];
  const error = errores[modulo];

  return (
    <aside className="rounded-3xl bg-(--c-superficie) p-6 shadow-(--c-sombra) lg:sticky lg:top-6 lg:self-start" aria-live="polite">
      <h2 className="text-sm font-medium text-(--c-tinta-suave)">Este apartado suma</h2>
      <p className="mt-1 flex items-baseline gap-2">
        <span className="cifra text-5xl font-semibold text-(--c-bosque)">{formatearToneladas(resultado?.totalKg ?? 0)}</span>
        <span className="text-sm text-(--c-tinta-suave)">t CO₂e/año</span>
      </p>
      {error ? (
        <p role="alert" className="mt-4 rounded-xl bg-(--c-alerta)/8 p-3 text-sm text-(--c-alerta)">
          {error.status === 400
            ? 'Con estos datos no se puede calcular. Revisa los campos marcados en rojo o vacíos.'
            : error.status === 429
              ? 'Demasiados cálculos seguidos. Espera un minuto y cambia cualquier dato para recalcular.'
              : 'No hay conexión con el servidor de cálculo. Se volverá a intentar al cambiar cualquier dato.'}
        </p>
      ) : resultado?.partidas?.length > 0 ? (
        <ul className="mt-5 grid gap-2 text-sm">
          {resultado.partidas.map((partida) => (
            <li key={partida.id} className="flex justify-between gap-3 border-t border-(--c-linea) pt-2">
              <span>{partida.etiqueta}</span>
              <span className="cifra whitespace-nowrap">{formatearKg(partida.kg)} kg</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-4 text-sm text-(--c-tinta-suave)">Rellena los datos y verás aquí cuánto suma cada cosa.</p>
      )}
      {nota && <div className="mt-5 text-xs text-(--c-tinta-suave)">{nota}</div>}
    </aside>
  );
}

/** Plantilla de cada paso: escena ilustrada, preguntas y resultado en vivo del apartado. */
export default function Paso({ modulo, titulo, intro, nota, children }) {
  const { marcarVisitado } = useCalculadora();
  const tituloRef = useRef(null);

  useEffect(() => {
    marcarVisitado(modulo);
    tituloRef.current?.focus();
  }, [modulo, marcarVisitado]);

  return (
    <article className="entrada-paso mt-8">
      <div className="h-36 overflow-hidden rounded-3xl sm:h-44">
        <Escena paso={modulo} />
      </div>
      <div className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,1fr)_19rem]">
        <div>
          <h1 ref={tituloRef} tabIndex={-1} className="titular text-3xl font-semibold sm:text-4xl focus:outline-none">{titulo}</h1>
          <p className="mt-3 max-w-prose text-[17px] text-(--c-tinta-suave)">{intro}</p>
          <form className="mt-8 grid gap-8" onSubmit={(evento) => evento.preventDefault()} noValidate>
            {children}
          </form>
        </div>
        <ResultadoApartado modulo={modulo} nota={nota} />
      </div>
      <NavegacionPasos />
    </article>
  );
}

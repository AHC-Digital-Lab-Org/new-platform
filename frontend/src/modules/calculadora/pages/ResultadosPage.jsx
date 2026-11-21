import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router';
import { useFetch } from '@/shared/hooks/useFetch.js';
import { calcularHuella } from '../api.js';
import { construirEntrada, useCalculadora } from '../CalculadoraContext.jsx';
import ResultadoGrafico, { formatearKg, formatearToneladas, MODULOS_RESULTADO, Planetas } from '../components/ResultadoGrafico.jsx';
import { botonPrincipal, botonSecundario, NavegacionPasos } from '../components/Paso.jsx';
import { useRutasPasos } from '../components/StepProgress.jsx';

const decimal = (numero, decimales = 1) => numero.toLocaleString('es-ES', { maximumFractionDigits: decimales, minimumFractionDigits: decimales });

function Comparacion({ totalKg, comparacion, presupuestoKg }) {
  const filas = [
    { id: 'tu', etiqueta: 'Tu huella', kg: totalKg, color: 'var(--c-bosque)' },
    comparacion && { id: 'media', etiqueta: `Media de ${comparacion.pais}*`, kg: comparacion.referenciaKg, color: 'var(--c-tierra)' },
    { id: 'objetivo', etiqueta: 'Objetivo 1,5 °C para 2030', kg: presupuestoKg, color: 'var(--c-hoja)' },
  ].filter(Boolean);
  const maximo = Math.max(...filas.map(({ kg }) => kg), 1);

  return (
    <dl className="grid gap-4">
      {filas.map(({ id, etiqueta, kg, color }) => (
        <div key={id} className="grid grid-cols-[8.5rem_1fr] items-center gap-3 sm:grid-cols-[12rem_1fr]">
          <dt className={`text-sm ${id === 'tu' ? 'font-semibold' : 'text-(--c-tinta-suave)'}`}>{etiqueta}</dt>
          <dd className="flex items-center gap-3">
            <span className="h-3.5 rounded-full transition-[width] duration-700 ease-out" style={{ width: `${(kg / maximo) * 100}%`, background: color, minWidth: '0.5rem' }} />
            <span className="cifra shrink-0 text-sm font-medium">{formatearToneladas(kg)} t</span>
          </dd>
        </div>
      ))}
    </dl>
  );
}

function Gestos({ gestos, totalKg, presupuestoKg }) {
  const [elegidos, setElegidos] = useState([]);
  const ahorroKg = gestos.filter(({ id }) => elegidos.includes(id)).reduce((suma, gesto) => suma + gesto.ahorroKg, 0);
  const conGestosKg = Math.max(0, totalKg - ahorroKg);
  const alternar = (id) => setElegidos((actuales) => (actuales.includes(id) ? actuales.filter((x) => x !== id) : [...actuales, id]));

  if (!gestos.length) {
    return <p className="text-(--c-tinta-suave)">Completa más apartados para ver qué pequeños cambios reducen más tu huella.</p>;
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_17rem]">
      <ul className="grid gap-3">
        {gestos.map((gesto) => {
          const activo = elegidos.includes(gesto.id);
          return (
            <li key={gesto.id}>
              <label className={`flex cursor-pointer gap-4 rounded-2xl border p-4 transition-colors duration-200 has-focus-visible:outline-3 has-focus-visible:outline-(--c-sol) ${activo ? 'border-(--c-hoja) bg-(--c-brote)/60' : 'border-(--c-linea) bg-(--c-superficie) hover:border-(--c-hoja)'}`}>
                <input type="checkbox" checked={activo} onChange={() => alternar(gesto.id)} className="sr-only" />
                <span aria-hidden="true" className={`mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full border-2 transition-colors ${activo ? 'border-(--c-bosque) bg-(--c-bosque) text-white' : 'border-(--c-linea)'}`}>
                  {activo && <svg viewBox="0 0 20 20" className="size-3.5"><path d="M4.5 10.5l3.5 3.5 7.5-8" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" /></svg>}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex flex-wrap items-baseline justify-between gap-x-4">
                    <span className="font-semibold">{gesto.titulo}</span>
                    <span className="cifra whitespace-nowrap text-sm font-semibold text-(--c-bosque)">−{formatearKg(gesto.ahorroKg)} kg/año</span>
                  </span>
                  <span className="mt-1 block text-sm text-(--c-tinta-suave)">{gesto.descripcion}</span>
                </span>
              </label>
            </li>
          );
        })}
      </ul>
      <div className="self-start rounded-3xl bg-(--c-bosque) p-6 text-white lg:sticky lg:top-6" aria-live="polite">
        <p className="text-sm text-white/80">{elegidos.length ? 'Con los gestos que has marcado' : 'Marca los gestos que te animas a hacer'}</p>
        <p className="mt-2 flex items-baseline gap-2">
          <span className="cifra text-5xl font-semibold">{formatearToneladas(conGestosKg)}</span>
          <span className="text-sm text-white/80">t CO₂e/año</span>
        </p>
        {elegidos.length > 0 && (
          <p className="mt-3 text-sm text-white/90">
            Ahorras <strong className="cifra">{formatearKg(ahorroKg)} kg</strong> al año: un {Math.round((ahorroKg / totalKg) * 100)} % de tu huella,
            y pasarías a {decimal(conGestosKg / presupuestoKg)} planetas.
          </p>
        )}
      </div>
    </div>
  );
}

export default function ResultadosPage() {
  const { formulario, visitados, reiniciar } = useCalculadora();
  const { rutaDe } = useRutasPasos();
  const entrada = useMemo(() => construirEntrada(formulario, visitados), [formulario, visitados]);
  const clave = JSON.stringify(entrada);
  const { data: resultado, error, loading } = useFetch(
    () => (visitados.length ? calcularHuella(entrada) : Promise.resolve(null)),
    [clave],
  );
  const tituloRef = useRef(null);
  useEffect(() => tituloRef.current?.focus(), []);

  const pendientes = MODULOS_RESULTADO.filter(({ id }) => !visitados.includes(id));

  return (
    <article className="entrada-paso informe-imprimible mt-8">
      <h1 ref={tituloRef} tabIndex={-1} className="titular text-3xl font-semibold sm:text-4xl focus:outline-none">Tu huella de carbono</h1>

      {!visitados.length && (
        <div className="mt-6 rounded-3xl bg-(--c-superficie) p-8 shadow-(--c-sombra)">
          <p className="text-lg">Aún no has rellenado ningún apartado.</p>
          <Link to={rutaDe('vivienda')} className={`${botonPrincipal} mt-5`}>Empezar por tu casa</Link>
        </div>
      )}
      {loading && visitados.length > 0 && <p className="mt-6 text-(--c-tinta-suave)" role="status">Calculando tu huella…</p>}
      {error && (
        <p className="mt-6 rounded-2xl bg-(--c-alerta)/8 p-4 text-(--c-alerta)" role="alert">
          {error.status === 400
            ? 'Hay algún dato que no se puede calcular. Vuelve al apartado correspondiente y revisa los campos marcados en rojo.'
            : error.status === 429
              ? 'Demasiados cálculos seguidos. Espera un minuto y recarga la página.'
              : 'No se ha podido conectar con el servidor de cálculo. Recarga la página en unos segundos.'}
        </p>
      )}

      {resultado && (
        <>
          <section className="mt-6 grid overflow-hidden rounded-[2rem] bg-(--c-superficie) shadow-(--c-sombra) lg:grid-cols-[1fr_1.1fr]">
            <div className="p-7 sm:p-9">
              <p className="text-(--c-tinta-suave)">Cada año emites</p>
              <p className="mt-1 flex items-baseline gap-3">
                <span className="cifra text-7xl leading-none font-semibold text-(--c-bosque) sm:text-8xl">{formatearToneladas(resultado.totalKg)}</span>
                <span className="text-lg text-(--c-tinta-suave)">toneladas de CO₂e</span>
              </p>
              <p className="mt-4 text-sm text-(--c-tinta-suave)">
                Margen orientativo: entre {formatearToneladas(Math.max(0, resultado.totalKg - resultado.incertidumbreKg))} y {formatearToneladas(resultado.totalKg + resultado.incertidumbreKg)} t,
                según la precisión de los datos y de los factores.
              </p>
              {resultado.compensacionFotovoltaicaKg > 0 && (
                <p className="mt-3 text-sm text-(--c-tinta-suave)">
                  Tus placas solares evitan unos {formatearKg(resultado.compensacionFotovoltaicaKg)} kg al año en la red: neto orientativo {formatearToneladas(resultado.netoOrientativoKg)} t.
                </p>
              )}
            </div>
            <div className="flex flex-col justify-center gap-4 bg-(--c-cielo)/60 p-7 sm:p-9">
              <Planetas valor={resultado.planetas.valor} />
              <p className="max-w-prose text-[17px]">
                Si toda la humanidad tuviera tu huella, harían falta <strong className="cifra">{decimal(resultado.planetas.valor)} planetas</strong> para
                cumplir el objetivo climático de 1,5 °C.
              </p>
            </div>
          </section>

          <div className="mt-10 grid gap-10 lg:grid-cols-2">
            <section aria-labelledby="titulo-desglose">
              <h2 id="titulo-desglose" className="titular text-2xl font-semibold">¿De dónde sale?</h2>
              <div className="mt-5"><ResultadoGrafico modulos={resultado.modulos} totalKg={resultado.totalKg} /></div>
              {pendientes.length > 0 && (
                <p className="no-imprimir mt-4 text-sm text-(--c-tinta-suave)">
                  Faltan datos de {pendientes.map(({ id, etiqueta }, i) => (
                    <span key={id}>{i > 0 && (i === pendientes.length - 1 ? ' y ' : ', ')}<Link to={rutaDe(id)} className="font-medium text-(--c-bosque) underline underline-offset-2">{etiqueta.toLowerCase()}</Link></span>
                  ))}: tu huella real será mayor.
                </p>
              )}
            </section>
            <section aria-labelledby="titulo-comparacion">
              <h2 id="titulo-comparacion" className="titular text-2xl font-semibold">¿Mucho o poco?</h2>
              <div className="mt-5">
                <Comparacion totalKg={resultado.totalKg} comparacion={resultado.comparacion} presupuestoKg={resultado.planetas.presupuestoKg} />
              </div>
              {resultado.comparacion && (
                <p className="mt-4 text-xs text-(--c-tinta-suave)">
                  * Emisiones territoriales de CO₂ por persona en {resultado.comparacion.anio} ({resultado.comparacion.fuente}).
                  Es una referencia orientativa: no equivale exactamente a una huella personal de consumo.
                </p>
              )}
            </section>
          </div>

          <section className="mt-12" aria-labelledby="titulo-gestos">
            <h2 id="titulo-gestos" className="titular text-2xl font-semibold">Tu granito de arena</h2>
            <p className="mt-1 max-w-prose text-(--c-tinta-suave)">
              Pequeños cambios calculados con tus propios datos, ordenados por lo que más reducen.
            </p>
            <div className="mt-6">
              <Gestos key={clave} gestos={resultado.gestos} totalKg={resultado.totalKg} presupuestoKg={resultado.planetas.presupuestoKg} />
            </div>
          </section>

          <section className="mt-12 border-t border-(--c-linea) pt-6 text-sm text-(--c-tinta-suave)" aria-labelledby="titulo-metodo">
            <h2 id="titulo-metodo" className="font-semibold text-(--c-tinta)">Cómo lo calculamos</h2>
            <p className="mt-2 max-w-prose">
              Metodología y factores de la calculadora de la Asociación Huella de Carbono (versión 1.2).
              Electricidad: {resultado.factorElectrico.origen === 'personalizado' ? 'factor indicado por ti' : resultado.factorElectrico.fuente}.
              El indicador de planetas compara tu huella con 2,5 t CO₂e por persona y año (IGES, 2019) y es orientativo.
              Es una herramienta de sensibilización: no sustituye una auditoría ni un inventario conforme a norma.
            </p>
          </section>

          <div className="no-imprimir mt-8 flex flex-wrap gap-3">
            <button type="button" onClick={() => window.print()} className={botonPrincipal}>Imprimir o guardar en PDF</button>
            <button type="button" onClick={reiniciar} className={botonSecundario}>Volver a empezar</button>
          </div>
        </>
      )}
      <NavegacionPasos />
    </article>
  );
}

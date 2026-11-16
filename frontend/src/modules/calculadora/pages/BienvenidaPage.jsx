import { useEffect, useRef } from 'react';
import { Link } from 'react-router';
import { useCalculadora } from '../CalculadoraContext.jsx';
import { Selector } from '../components/Campos.jsx';
import Escena, { IconoPaso } from '../components/Escena.jsx';
import { botonPrincipal, botonSecundario } from '../components/Paso.jsx';
import { useRutasPasos } from '../components/StepProgress.jsx';

const QUE_NECESITAS = [
  { paso: 'vivienda', titulo: 'Tu casa', texto: 'Los kWh de luz y el gas o gasóleo del último año. Están en tus facturas.' },
  { paso: 'transporte', titulo: 'Cómo te mueves', texto: 'Los kilómetros que haces a la semana en coche, moto, bus, metro o tren.' },
  { paso: 'vuelos', titulo: 'Tus vuelos', texto: 'Los viajes en avión del último año: origen, destino y cuántas veces.' },
  { paso: 'productos', titulo: 'Lo que consumes', texto: 'Cuánto gastas más o menos en comida, ropa, ocio y aparatos.' },
];

export default function BienvenidaPage() {
  const { catalogo, formulario, visitados, actualizar, reiniciar } = useCalculadora();
  const { rutaDe } = useRutasPasos();
  const tituloRef = useRef(null);
  useEffect(() => tituloRef.current?.focus(), []);

  return (
    <article className="entrada-paso mt-8">
      <div className="grid overflow-hidden rounded-[2rem] bg-(--c-superficie) shadow-(--c-sombra) lg:grid-cols-[1.1fr_1fr]">
        <div className="p-7 sm:p-10">
          <h1 ref={tituloRef} tabIndex={-1} className="titular text-4xl leading-[1.05] font-semibold sm:text-5xl focus:outline-none">
            ¿Cuánto pesa tu día a día en el planeta?
          </h1>
          <p className="mt-5 max-w-prose text-lg text-(--c-tinta-suave)">
            Calcula tu huella de carbono personal en cinco pasos y descubre los pequeños gestos que más la reducen.
            Usamos la metodología y los factores de emisión de la Asociación Huella de Carbono.
          </p>

          <div className="mt-8 flex flex-wrap items-end gap-4">
            {catalogo.data ? (
              <Selector
                etiqueta="País en el que vives"
                ayuda="Ajusta la electricidad a su mix y te compara con su media."
                valor={formulario.general.pais}
                opciones={catalogo.data.paises.map(({ id, nombre }) => ({ id, etiqueta: nombre }))}
                onCambio={(pais) => actualizar('general', { pais })}
              />
            ) : (
              <p className="text-sm text-(--c-tinta-suave)" role="status">
                {catalogo.error ? 'No se ha podido conectar con el servidor de cálculo. Recarga la página en unos segundos.' : 'Preparando la calculadora…'}
              </p>
            )}
          </div>

          <div className="mt-8 flex flex-wrap gap-3">
            <Link to={rutaDe('vivienda')} className={botonPrincipal}>
              {visitados.length ? 'Seguir donde lo dejé' : 'Empezar'}
            </Link>
            {visitados.length > 0 && (
              <button type="button" onClick={reiniciar} className={botonSecundario}>Empezar de cero</button>
            )}
          </div>
          <p className="mt-4 text-sm text-(--c-tinta-suave)">
            Tus respuestas solo se guardan en esta pestaña del navegador y se borran al cerrarla.
          </p>
        </div>
        <div className="h-56 bg-(--c-cielo) lg:h-full">
          <Escena paso="bienvenida" anclarAbajo />
        </div>
      </div>

      <section className="mt-12" aria-labelledby="que-necesitas">
        <h2 id="que-necesitas" className="titular text-2xl font-semibold">Ten a mano, si puedes</h2>
        <p className="mt-1 text-(--c-tinta-suave)">Si no tienes un dato exacto, una estimación sirve: cada paso te ayuda a calcularla.</p>
        <ol className="mt-6 grid gap-x-8 gap-y-6 sm:grid-cols-2">
          {QUE_NECESITAS.map(({ paso, titulo, texto }) => (
            <li key={paso} className="flex gap-4">
              <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-(--c-brote) text-(--c-bosque)">
                <IconoPaso paso={paso} />
              </span>
              <div>
                <h3 className="font-semibold">{titulo}</h3>
                <p className="mt-0.5 text-sm text-(--c-tinta-suave)">{texto}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>
    </article>
  );
}

import { useId } from 'react';
import { aNumero } from '../CalculadoraContext.jsx';

// Una etiqueta pasada como <span className="sr-only"> no ocupa sitio: el control no necesita margen superior.
const esOculta = (etiqueta) => etiqueta?.props?.className === 'sr-only';

const claseEntrada = 'w-full rounded-xl border bg-(--c-superficie) px-3.5 py-2.5 text-base text-(--c-tinta) transition-colors placeholder:text-(--c-tinta-suave)/80 hover:border-(--c-hoja) focus:border-(--c-bosque) focus:outline-none';

/** Grupo de preguntas de un paso. Separado por una línea, sin tarjetas anidadas. */
export function Bloque({ titulo, descripcion, children, accion }) {
  return (
    <section className="border-t border-(--c-linea) pt-7 first:border-t-0 first:pt-0">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="max-w-prose">
          <h2 className="titular text-xl font-semibold">{titulo}</h2>
          {descripcion && <p className="mt-1 text-sm text-(--c-tinta-suave)">{descripcion}</p>}
        </div>
        {accion}
      </div>
      <div className="mt-5 grid gap-5">{children}</div>
    </section>
  );
}

/** Campo numérico que acepta coma decimal («1,5») y avisa de valores no válidos. */
export function CampoNumero({ etiqueta, ayuda, valor, onCambio, unidad, placeholder, ancho = 'max-w-xs', min = 0, max, junto }) {
  const id = useId();
  const numero = aNumero(valor);
  const error = Number.isNaN(numero)
    ? 'Escribe solo un número, por ejemplo 1200 o 1,5.'
    : numero < min
      ? `El valor no puede ser menor que ${min}.`
      : max !== undefined && numero > max
        ? `El valor máximo es ${max.toLocaleString('es-ES')}.`
        : null;
  const descripcion = [ayuda && `${id}-ayuda`, error && `${id}-error`].filter(Boolean).join(' ') || undefined;

  return (
    <div className={junto ? 'w-full' : ancho}>
      <label htmlFor={id} className="block text-sm font-medium">{etiqueta}</label>
      {ayuda && <p id={`${id}-ayuda`} className="mt-0.5 max-w-prose text-sm text-(--c-tinta-suave)">{ayuda}</p>}
      <div className={junto ? 'mt-2 flex flex-wrap items-center gap-3' : ''}>
      <div className={junto ? `relative w-full ${ancho}` : `relative ${esOculta(etiqueta) ? '' : 'mt-2'}`}>
        <input
          id={id}
          type="text"
          inputMode="decimal"
          autoComplete="off"
          value={valor}
          placeholder={placeholder}
          onChange={(evento) => onCambio(evento.target.value)}
          aria-invalid={error ? 'true' : undefined}
          aria-describedby={descripcion}
          className={`${claseEntrada} ${unidad ? 'pr-24' : ''} ${error ? 'border-(--c-alerta)' : 'border-(--c-linea)'}`}
        />
        {unidad && (
          <span className="pointer-events-none absolute inset-y-0 right-3.5 flex items-center text-sm text-(--c-tinta-suave)">{unidad}</span>
        )}
      </div>
      {junto}
      </div>
      {error && <p id={`${id}-error`} role="alert" className="mt-1.5 text-sm font-medium text-(--c-alerta)">{error}</p>}
    </div>
  );
}

/** Opciones como chips grandes: radio (una) o checkbox (varias), con teclado nativo. */
export function Opciones({ etiqueta, ayuda, opciones, valor, onCambio, multiple = false, compacto = false }) {
  const nombre = useId();
  const seleccionada = (id) => (multiple ? valor.includes(id) : valor === id);
  const cambiar = (id) => {
    if (!multiple) return onCambio(id);
    return onCambio(valor.includes(id) ? valor.filter((actual) => actual !== id) : [...valor, id]);
  };

  return (
    <fieldset className="min-w-0">
      <legend className="text-sm font-medium">{etiqueta}</legend>
      {ayuda && <p className="mt-0.5 text-sm text-(--c-tinta-suave)">{ayuda}</p>}
      <div className={`flex flex-wrap gap-2 ${esOculta(etiqueta) ? '' : 'mt-2.5'}`}>
        {opciones.map((opcion) => (
          <label
            key={opcion.id}
            className={`group relative flex cursor-pointer items-center gap-2 rounded-full border transition-[background-color,border-color,box-shadow] duration-200 has-focus-visible:outline-3 has-focus-visible:outline-offset-2 has-focus-visible:outline-(--c-sol) ${compacto ? 'px-3.5 py-1.5 text-sm' : 'px-4 py-2.5 text-[15px]'} ${seleccionada(opcion.id)
              ? 'border-(--c-bosque) bg-(--c-bosque) text-white shadow-[0_6px_16px_-8px_rgb(31_81_55/0.7)]'
              : 'border-(--c-linea) bg-(--c-superficie) text-(--c-tinta) hover:border-(--c-hoja) hover:bg-(--c-brote)/50'}`}
          >
            <input
              type={multiple ? 'checkbox' : 'radio'}
              name={nombre}
              value={opcion.id}
              checked={seleccionada(opcion.id)}
              onChange={() => cambiar(opcion.id)}
              className="sr-only"
            />
            {opcion.icono}
            <span>{opcion.etiqueta}</span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}

export function Selector({ etiqueta, ayuda, valor, opciones, onCambio, ancho = 'max-w-xs' }) {
  const id = useId();
  return (
    <div className={ancho}>
      <label htmlFor={id} className="block text-sm font-medium">{etiqueta}</label>
      {ayuda && <p className="mt-0.5 text-sm text-(--c-tinta-suave)">{ayuda}</p>}
      <select
        id={id}
        value={valor}
        onChange={(evento) => onCambio(evento.target.value)}
        className={`${claseEntrada} ${esOculta(etiqueta) ? '' : 'mt-2'} border-(--c-linea) pr-8`}
      >
        {opciones.map((opcion) => <option key={opcion.id} value={opcion.id}>{opcion.etiqueta}</option>)}
      </select>
    </div>
  );
}

/** Pregunta de sí/no que abre o cierra una sección. */
export function Interruptor({ etiqueta, descripcion, activo, onCambio }) {
  const id = useId();
  return (
    <div className="flex items-start gap-4">
      <button
        id={id}
        type="button"
        role="switch"
        aria-checked={activo}
        onClick={() => onCambio(!activo)}
        className={`relative mt-0.5 h-7 w-12 shrink-0 rounded-full transition-colors duration-200 ${activo ? 'bg-(--c-bosque)' : 'bg-(--c-linea)'}`}
      >
        <span
          className={`absolute top-1 left-1 size-5 rounded-full bg-white shadow-sm transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] ${activo ? 'translate-x-5' : ''}`}
        />
      </button>
      <label htmlFor={id} className="cursor-pointer">
        <span className="block text-[15px] font-medium">{etiqueta}</span>
        {descripcion && <span className="mt-0.5 block text-sm text-(--c-tinta-suave)">{descripcion}</span>}
      </label>
    </div>
  );
}

/** Opciones avanzadas plegadas para no alargar el paso. */
export function MasOpciones({ titulo, children }) {
  return (
    <details className="group rounded-2xl border border-dashed border-(--c-linea) px-4 py-3 open:bg-(--c-superficie)/60">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-sm font-medium text-(--c-bosque) [&::-webkit-details-marker]:hidden">
        {titulo}
        <svg viewBox="0 0 20 20" className="size-4 transition-transform duration-200 group-open:rotate-180" aria-hidden="true">
          <path d="M5 8l5 5 5-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </summary>
      <div className="mt-4 grid gap-5 pb-1">{children}</div>
    </details>
  );
}

/** Número con su periodo (semana, mes o año) para que nadie tenga que calcular kilómetros anuales. */
export function CampoConPeriodo({ etiqueta, ayuda, valor, periodo, onValor, onPeriodo, unidad = 'km', periodos }) {
  return (
    <CampoNumero
      etiqueta={etiqueta}
      ayuda={ayuda}
      valor={valor}
      onCambio={onValor}
      unidad={unidad}
      ancho="max-w-[15rem]"
      junto={(
        <Opciones
          etiqueta={<span className="sr-only">Periodo de {String(etiqueta).toLowerCase()}</span>}
          opciones={Object.entries(periodos).map(([id, { etiqueta: texto }]) => ({ id, etiqueta: texto }))}
          valor={periodo}
          onCambio={onPeriodo}
          compacto
        />
      )}
    />
  );
}

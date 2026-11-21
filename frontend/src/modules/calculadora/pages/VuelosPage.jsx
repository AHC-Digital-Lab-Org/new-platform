import { useId, useMemo } from 'react';
import { nuevoViaje, useCalculadora } from '../CalculadoraContext.jsx';
import { Bloque, CampoNumero, Interruptor, Opciones, Selector } from '../components/Campos.jsx';
import Paso, { botonSecundario } from '../components/Paso.jsx';

const textoAeropuerto = ({ codigo, ciudad, nombre }) => `${codigo} · ${ciudad} (${nombre})`;

const normalizar = (texto) => texto.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();

// Admite el texto de la lista, el código IATA («mad») o el nombre exacto de la ciudad.
const resolverAeropuerto = (texto, aeropuertos) => {
  const buscado = normalizar(texto);
  if (!buscado) return null;
  return aeropuertos.find((aeropuerto) => normalizar(textoAeropuerto(aeropuerto)) === buscado
    || normalizar(aeropuerto.codigo) === buscado
    || normalizar(aeropuerto.ciudad) === buscado) ?? null;
};

function CampoAeropuerto({ etiqueta, texto, listaId, aeropuertos, onCambio }) {
  const id = useId();
  const encontrado = resolverAeropuerto(texto, aeropuertos);
  const error = texto.trim() && !encontrado ? 'No está en la lista. Elige uno parecido o indica los kilómetros.' : null;
  return (
    <div className="min-w-0 flex-1 basis-56">
      <label htmlFor={id} className="block text-sm font-medium">{etiqueta}</label>
      <input
        id={id}
        list={listaId}
        value={texto}
        placeholder="Ciudad o código, p. ej. Madrid"
        autoComplete="off"
        onChange={(evento) => {
          const valor = evento.target.value;
          onCambio(valor, resolverAeropuerto(valor, aeropuertos)?.codigo ?? '');
        }}
        aria-invalid={error ? 'true' : undefined}
        aria-describedby={error ? `${id}-error` : undefined}
        className={`mt-2 w-full rounded-xl border bg-(--c-superficie) px-3.5 py-2.5 text-base hover:border-(--c-hoja) focus:border-(--c-bosque) focus:outline-none ${error ? 'border-(--c-alerta)' : 'border-(--c-linea)'}`}
      />
      {error && <p id={`${id}-error`} role="alert" className="mt-1.5 text-sm font-medium text-(--c-alerta)">{error}</p>}
    </div>
  );
}

function Viaje({ viaje, numero, opciones, listaId, onCambio, onQuitar }) {
  return (
    <li className="grid gap-5 rounded-3xl border border-(--c-linea) bg-(--c-superficie) p-5 sm:p-6">
      <div className="flex items-center justify-between gap-3">
        <h3 className="titular text-lg font-semibold">Viaje {numero}</h3>
        <button type="button" onClick={onQuitar} className="rounded-full px-3 py-1.5 text-sm font-medium text-(--c-alerta) hover:bg-(--c-alerta)/8">
          Quitar<span className="sr-only"> el viaje {numero}</span>
        </button>
      </div>
      <Opciones
        etiqueta="¿Cómo indicas la distancia?"
        opciones={[
          { id: 'aeropuertos', etiqueta: 'Origen y destino' },
          { id: 'horas', etiqueta: 'Horas de vuelo' },
          { id: 'km', etiqueta: 'Kilómetros' },
        ]}
        valor={viaje.modo}
        onCambio={(modo) => onCambio({ modo })}
        compacto
      />
      {viaje.modo === 'aeropuertos' && (
        <div className="flex flex-wrap gap-4">
          <CampoAeropuerto
            etiqueta="Desde"
            texto={viaje.origenTexto ?? ''}
            listaId={listaId}
            aeropuertos={opciones.aeropuertos}
            onCambio={(origenTexto, origen) => onCambio({ origenTexto, origen })}
          />
          <CampoAeropuerto
            etiqueta="Hasta"
            texto={viaje.destinoTexto ?? ''}
            listaId={listaId}
            aeropuertos={opciones.aeropuertos}
            onCambio={(destinoTexto, destino) => onCambio({ destinoTexto, destino })}
          />
        </div>
      )}
      {viaje.modo === 'horas' && (
        <CampoNumero etiqueta="Duración de cada trayecto" valor={viaje.horas} onCambio={(horas) => onCambio({ horas })} unidad="horas" max={24} />
      )}
      {viaje.modo === 'km' && (
        <CampoNumero etiqueta="Distancia de cada trayecto" valor={viaje.km} onCambio={(km) => onCambio({ km })} unidad="km" max={20_000} />
      )}
      <div className="flex flex-wrap items-end gap-x-6 gap-y-5">
        <Opciones
          etiqueta="Trayecto"
          opciones={opciones.itinerarios}
          valor={viaje.itinerario}
          onCambio={(itinerario) => onCambio({ itinerario })}
          compacto
        />
        <CampoNumero etiqueta="¿Cuántas veces?" valor={viaje.veces} onCambio={(veces) => onCambio({ veces })} ancho="w-32" min={1} max={100} />
        <Selector etiqueta="Clase" valor={viaje.clase} opciones={opciones.clases} onCambio={(clase) => onCambio({ clase })} ancho="w-44" />
      </div>
    </li>
  );
}

export default function VuelosPage() {
  const { formulario, actualizar, catalogo } = useCalculadora();
  const vuelos = formulario.vuelos;
  const opciones = catalogo.data?.vuelos;
  const listaId = useId();
  const listaAeropuertos = useMemo(
    () => opciones?.aeropuertos.map((aeropuerto) => <option key={aeropuerto.codigo} value={textoAeropuerto(aeropuerto)} />),
    [opciones],
  );

  const cambiarViaje = (id, cambio) => actualizar('vuelos', (actual) => ({
    ...actual,
    viajes: actual.viajes.map((viaje) => (viaje.id === id ? { ...viaje, ...cambio } : viaje)),
  }));
  const anadirViaje = () => actualizar('vuelos', (actual) => ({ ...actual, sinVuelos: false, viajes: [...actual.viajes, nuevoViaje()] }));
  const quitarViaje = (id) => actualizar('vuelos', (actual) => ({ ...actual, viajes: actual.viajes.filter((viaje) => viaje.id !== id) }));

  return (
    <Paso
      modulo="vuelos"
      titulo="Tus vuelos"
      intro="Añade los viajes en avión del último año. Si un viaje tuvo escala, añade cada vuelo por separado (por ejemplo, Madrid → París y París → Nueva York)."
      nota={`Factores por distancia de UK Government 2025. La lectura completa multiplica por ${opciones?.multiplicadorNoCo2?.toLocaleString('es-ES') ?? '1,7'} para incluir el efecto de las estelas y otros gases (no-CO₂).`}
    >
      <Bloque titulo="Viajes en avión">
        <Interruptor
          etiqueta="No he volado en el último año"
          activo={vuelos.sinVuelos}
          onCambio={(sinVuelos) => actualizar('vuelos', { sinVuelos })}
        />
        {!vuelos.sinVuelos && opciones && (
          <>
            <datalist id={listaId}>{listaAeropuertos}</datalist>
            {vuelos.viajes.length > 0 && (
              <ol className="grid gap-4">
                {vuelos.viajes.map((viaje, indice) => (
                  <Viaje
                    key={viaje.id}
                    viaje={viaje}
                    numero={indice + 1}
                    opciones={opciones}
                    listaId={listaId}
                    onCambio={(cambio) => cambiarViaje(viaje.id, cambio)}
                    onQuitar={() => quitarViaje(viaje.id)}
                  />
                ))}
              </ol>
            )}
            <div>
              <button type="button" onClick={anadirViaje} className={botonSecundario}>
                <svg viewBox="0 0 20 20" className="size-4" aria-hidden="true"><path d="M10 4v12M4 10h12" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></svg>
                {vuelos.viajes.length ? 'Añadir otro viaje' : 'Añadir un viaje'}
              </button>
            </div>
          </>
        )}
      </Bloque>

      {!vuelos.sinVuelos && (
        <Bloque titulo="¿Qué impacto quieres sumar?" descripcion="Los aviones calientan el planeta también con las estelas de condensación y los óxidos de nitrógeno. Recomendamos la lectura completa para no quedarse corto.">
          <Opciones
            etiqueta={<span className="sr-only">Impacto de los vuelos</span>}
            opciones={[
              { id: 'ampliado', etiqueta: 'Impacto completo (recomendado)' },
              { id: 'directo', etiqueta: 'Solo emisiones directas' },
            ]}
            valor={vuelos.criterio}
            onCambio={(criterio) => actualizar('vuelos', { criterio })}
            compacto
          />
        </Bloque>
      )}
    </Paso>
  );
}

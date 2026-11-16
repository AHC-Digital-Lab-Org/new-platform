import { useEffect } from 'react';
import { PERIODOS, useCalculadora } from '../CalculadoraContext.jsx';
import { Bloque, CampoConPeriodo, CampoNumero, Interruptor, MasOpciones, Opciones, Selector } from '../components/Campos.jsx';
import Paso from '../components/Paso.jsx';

const OCUPACION = [
  { id: '1', etiqueta: 'Solo yo' },
  { id: '1.5', etiqueta: 'A veces con alguien' },
  { id: '2', etiqueta: '2 personas' },
  { id: '3', etiqueta: '3' },
  { id: '4', etiqueta: '4 o más' },
];

const decimal = (numero) => numero?.toLocaleString('es-ES');

export default function TransportePage() {
  const { formulario, actualizar, catalogo } = useCalculadora();
  const { usaCoche, coche, usaMoto, moto, publico } = formulario.transporte;
  const opciones = catalogo.data?.transporte;
  const energia = opciones?.energias.find(({ id }) => id === coche.energia);
  const combustible = opciones?.combustiblesEnchufable.find(({ id }) => id === coche.combustibleTermico);

  const cambiar = (seccion, cambio) => actualizar('transporte', (actual) => ({ ...actual, [seccion]: { ...actual[seccion], ...cambio } }));

  // El consumo medio orientativo se usa si la persona no conoce el de su vehículo.
  useEffect(() => {
    if (!energia) return;
    if (coche.consumoOrientativo !== energia.consumoOrientativo || coche.consumoCombustibleOrientativo !== combustible?.consumoOrientativo) {
      cambiar('coche', { consumoOrientativo: energia.consumoOrientativo, consumoCombustibleOrientativo: combustible?.consumoOrientativo });
    }
  });

  const esElectrico = energia && energia.tipo !== 'liquido';

  return (
    <Paso
      modulo="transporte"
      titulo="Cómo te mueves"
      intro="Cuenta solo tus trayectos habituales por tierra: al trabajo, a clase, a la compra, de fin de semana. Los aviones van en el siguiente paso."
      nota="Coche con factores MITECO 2024; moto, bus, tren, metro y taxi con factores por pasajero-km de UK Government 2025."
    >
      <Bloque titulo="Coche">
        <Interruptor
          etiqueta="Viajo en coche (mío, familiar o compartido)"
          descripcion="El taxi y el VTC van más abajo."
          activo={usaCoche}
          onCambio={(activo) => actualizar('transporte', { usaCoche: activo })}
        />
        {usaCoche && opciones && (
          <>
            <CampoConPeriodo
              etiqueta="Kilómetros en coche"
              ayuda="Solo los trayectos en los que vas tú. Una referencia: 10 km de ida al trabajo son unos 100 km a la semana."
              valor={coche.km}
              periodo={coche.periodo}
              periodos={PERIODOS}
              onValor={(km) => cambiar('coche', { km })}
              onPeriodo={(periodo) => cambiar('coche', { periodo })}
            />
            <Opciones
              etiqueta="¿Qué energía usa?"
              opciones={opciones.energias.map(({ id, etiqueta }) => ({ id, etiqueta }))}
              valor={coche.energia}
              onCambio={(nueva) => cambiar('coche', { energia: nueva, consumo: '' })}
              compacto
            />
            <CampoNumero
              etiqueta={coche.energia === 'hibrido_enchufable' ? 'Consumo en modo eléctrico' : 'Consumo medio'}
              ayuda={`Si no lo sabes, déjalo vacío: usaremos ${decimal(energia.consumoOrientativo)} ${energia.unidad}, un valor medio orientativo.`}
              valor={coche.consumo}
              placeholder={decimal(energia.consumoOrientativo)}
              onCambio={(consumo) => cambiar('coche', { consumo })}
              unidad={energia.unidad}
              max={energia.consumoMaximo}
            />
            <Opciones
              etiqueta="¿Con cuántas personas sueles ir?"
              ayuda="Las emisiones del coche se reparten entre quienes viajan."
              opciones={OCUPACION}
              valor={coche.ocupacion}
              onCambio={(ocupacion) => cambiar('coche', { ocupacion })}
              compacto
            />
            {coche.energia === 'hibrido_enchufable' && (
              <div className="grid gap-5 rounded-2xl bg-(--c-brote)/45 p-5">
                <CampoNumero
                  etiqueta="Kilómetros que haces en modo eléctrico"
                  valor={coche.porcentajeKmElectrico}
                  onCambio={(porcentajeKmElectrico) => cambiar('coche', { porcentajeKmElectrico })}
                  unidad="%"
                  max={100}
                />
                <Opciones
                  etiqueta="Combustible del motor térmico"
                  opciones={opciones.combustiblesEnchufable.map(({ id, etiqueta }) => ({ id, etiqueta }))}
                  valor={coche.combustibleTermico}
                  onCambio={(combustibleTermico) => cambiar('coche', { combustibleTermico })}
                  compacto
                />
                <CampoNumero
                  etiqueta="Consumo con el motor térmico"
                  ayuda={`Si no lo sabes, usaremos ${decimal(combustible?.consumoOrientativo)} L/100 km.`}
                  valor={coche.consumoCombustible}
                  placeholder={decimal(combustible?.consumoOrientativo)}
                  onCambio={(consumoCombustible) => cambiar('coche', { consumoCombustible })}
                  unidad="L/100 km"
                  max={35}
                />
              </div>
            )}
            {esElectrico && (
              <MasOpciones titulo="Carga del coche eléctrico">
                <Selector
                  etiqueta="¿De dónde sale el dato de consumo?"
                  valor={coche.origenConsumoElectrico}
                  opciones={[
                    { id: 'no_se', etiqueta: 'No lo sé / aproximado' },
                    { id: 'vehiculo_ficha', etiqueta: 'Ordenador del coche o ficha técnica' },
                    { id: 'contador_punto_carga', etiqueta: 'Contador o punto de carga' },
                  ]}
                  onCambio={(origenConsumoElectrico) => cambiar('coche', { origenConsumoElectrico })}
                  ancho="max-w-sm"
                />
                <Opciones
                  etiqueta="¿La carga en casa ya está en tu consumo eléctrico de Vivienda?"
                  ayuda="Así no contamos dos veces la misma electricidad."
                  opciones={[{ id: 'no', etiqueta: 'No' }, { id: 'si', etiqueta: 'Sí, toda' }, { id: 'parcial', etiqueta: 'Una parte' }]}
                  valor={coche.cargaIncluidaVivienda}
                  onCambio={(cargaIncluidaVivienda) => cambiar('coche', { cargaIncluidaVivienda })}
                  compacto
                />
                {coche.cargaIncluidaVivienda === 'parcial' && (
                  <CampoNumero
                    etiqueta="Parte de la carga incluida en Vivienda"
                    valor={coche.porcentajeCargaIncluida}
                    onCambio={(porcentajeCargaIncluida) => cambiar('coche', { porcentajeCargaIncluida })}
                    unidad="%"
                    max={100}
                  />
                )}
              </MasOpciones>
            )}
          </>
        )}
      </Bloque>

      <Bloque titulo="Moto">
        <Interruptor
          etiqueta="Uso moto, ciclomotor o escúter"
          activo={usaMoto}
          onCambio={(activo) => actualizar('transporte', { usaMoto: activo })}
        />
        {usaMoto && opciones && (
          <>
            <CampoConPeriodo
              etiqueta="Kilómetros en moto"
              valor={moto.km}
              periodo={moto.periodo}
              periodos={PERIODOS}
              onValor={(km) => cambiar('moto', { km })}
              onPeriodo={(periodo) => cambiar('moto', { periodo })}
            />
            <Opciones
              etiqueta="Tipo de moto"
              opciones={opciones.motos}
              valor={moto.tipo}
              onCambio={(tipo) => cambiar('moto', { tipo })}
              compacto
            />
          </>
        )}
      </Bloque>

      <Bloque
        titulo="Transporte público y taxi"
        descripcion="Kilómetros aproximados que haces como pasajera o pasajero. Deja vacío lo que no uses."
        accion={(
          <Opciones
            etiqueta={<span className="sr-only">Periodo de los kilómetros</span>}
            opciones={Object.entries(PERIODOS).map(([id, { etiqueta }]) => ({ id, etiqueta }))}
            valor={publico.periodo}
            onCambio={(periodo) => cambiar('publico', { periodo })}
            compacto
          />
        )}
      >
        {opciones && (
          <div className="grid gap-5 sm:grid-cols-2">
            {opciones.modosPublicos.map(({ id, etiqueta }) => (
              <CampoNumero
                key={id}
                etiqueta={etiqueta}
                valor={publico[id]}
                onCambio={(km) => cambiar('publico', { [id]: km })}
                unidad={PERIODOS[publico.periodo].corto}
                ancho="w-full"
              />
            ))}
          </div>
        )}
        {opciones && publico.tren && (
          <Selector
            etiqueta="Tipo de tren"
            valor={publico.tipoTren}
            opciones={opciones.tiposTren}
            onCambio={(tipoTren) => cambiar('publico', { tipoTren })}
            ancho="max-w-sm"
          />
        )}
      </Bloque>
    </Paso>
  );
}

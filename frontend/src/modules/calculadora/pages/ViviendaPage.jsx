import { useCalculadora } from '../CalculadoraContext.jsx';
import { Bloque, CampoNumero, MasOpciones, Opciones, Selector } from '../components/Campos.jsx';
import Paso from '../components/Paso.jsx';

const UNIDADES = {
  kWh_anual: 'kWh/año',
  m3_anual: 'm³/año',
  litros_anual: 'litros/año',
  kg_anual: 'kg/año',
  toneladas_anual: 't/año',
};

const CALEFACCION = [
  { id: 'gas', etiqueta: 'Gas natural', ayuda: 'En la factura del gas, en kWh o m³ del último año.' },
  { id: 'gasoleo', etiqueta: 'Gasóleo', ayuda: 'Los litros que compraste en el año.' },
  { id: 'propano', etiqueta: 'Propano', ayuda: 'Mejor en kg. Una bombona estándar son 12,5 kg.' },
  { id: 'glp', etiqueta: 'GLP / butano', ayuda: 'Litros o kg del año.' },
  { id: 'pellets', etiqueta: 'Pellets', ayuda: 'Kilos o toneladas del año.' },
  { id: 'carbon', etiqueta: 'Carbón', ayuda: 'Kilos o toneladas del año.' },
];

export default function ViviendaPage() {
  const { formulario, actualizar, catalogo } = useCalculadora();
  const vivienda = formulario.vivienda;
  const unidadesDe = (fuente) => catalogo.data?.vivienda.fuentes.find(({ id }) => id === fuente)?.unidades ?? [vivienda.consumos[fuente].unidad];

  const cambiarConsumo = (fuente, cambio) => actualizar('vivienda', (actual) => ({
    ...actual,
    consumos: { ...actual.consumos, [fuente]: { ...actual.consumos[fuente], ...cambio } },
  }));

  const campoConsumo = (fuente, etiqueta, ayuda) => {
    const unidades = unidadesDe(fuente);
    return (
      <CampoNumero
        key={fuente}
        etiqueta={etiqueta}
        ayuda={ayuda}
        valor={vivienda.consumos[fuente].valor}
        onCambio={(valor) => cambiarConsumo(fuente, { valor })}
        unidad={UNIDADES[vivienda.consumos[fuente].unidad]}
        placeholder="0"
        max={1_000_000}
        junto={unidades.length > 1 && (
          <Selector
            etiqueta={<span className="sr-only">Unidad de {etiqueta.toLowerCase()}</span>}
            valor={vivienda.consumos[fuente].unidad}
            opciones={unidades.map((id) => ({ id, etiqueta: UNIDADES[id] }))}
            onCambio={(unidad) => cambiarConsumo(fuente, { unidad })}
            ancho="w-36"
          />
        )}
      />
    );
  };

  return (
    <Paso
      modulo="vivienda"
      titulo="Tu casa"
      intro="Calculamos la energía de todo el hogar en un año y la repartimos entre quienes vivís en él."
      nota="Electricidad con el factor medio de la red de tu país (Ember 2024) y combustibles con factores MITECO."
    >
      <Bloque titulo="¿Cuántas personas vivís en casa?" descripcion="Cuenta también a niñas y niños: el consumo se reparte entre todas las personas.">
        <Opciones
          etiqueta={<span className="sr-only">Personas en la vivienda</span>}
          opciones={[...[1, 2, 3, 4, 5, 6].map((n) => ({ id: n, etiqueta: String(n) })), { id: 'mas', etiqueta: 'Más de 6' }]}
          valor={vivienda.personas > 6 ? 'mas' : vivienda.personas}
          onCambio={(personas) => actualizar('vivienda', { personas: personas === 'mas' ? 7 : personas })}
        />
        {vivienda.personas > 6 && (
          <Selector
            etiqueta="Número de personas"
            valor={vivienda.personas}
            opciones={Array.from({ length: 14 }, (_, i) => ({ id: i + 7, etiqueta: String(i + 7) }))}
            onCambio={(personas) => actualizar('vivienda', { personas: Number(personas) })}
            ancho="w-40"
          />
        )}
      </Bloque>

      <Bloque titulo="Electricidad" descripcion="Aparece en la factura como «consumo» en kWh. Suma los últimos 12 meses o multiplica un mes por 12.">
        {campoConsumo('electricidad', 'Consumo de electricidad al año')}
        <Opciones
          etiqueta="¿De dónde sale el dato?"
          opciones={[{ id: 'factura', etiqueta: 'De mis facturas' }, { id: 'estimado', etiqueta: 'Es una estimación' }]}
          valor={vivienda.origenDato}
          onCambio={(origenDato) => actualizar('vivienda', { origenDato })}
          compacto
        />
      </Bloque>

      <Bloque titulo="Calefacción y agua caliente" descripcion="Marca lo que uses además de la electricidad. Si todo es eléctrico, no marques nada.">
        <Opciones
          etiqueta={<span className="sr-only">Fuentes de calefacción</span>}
          opciones={CALEFACCION.map(({ id, etiqueta }) => ({ id, etiqueta }))}
          valor={vivienda.calefaccion}
          onCambio={(calefaccion) => actualizar('vivienda', { calefaccion })}
          multiple
        />
        {CALEFACCION.filter(({ id }) => vivienda.calefaccion.includes(id))
          .map(({ id, etiqueta, ayuda }) => campoConsumo(id, `${etiqueta} al año`, ayuda))}
      </Bloque>

      <MasOpciones titulo="Placas solares y factor eléctrico propio">
        <CampoNumero
          etiqueta="Excedente fotovoltaico vertido a la red"
          ayuda="Si tienes placas, pon en Electricidad solo los kWh comprados a la red. El excedente se muestra aparte como compensación orientativa."
          valor={vivienda.excedenteFotovoltaico}
          onCambio={(excedenteFotovoltaico) => actualizar('vivienda', { excedenteFotovoltaico })}
          unidad="kWh/año"
          max={200_000}
        />
        <CampoNumero
          etiqueta="Factor de emisión de tu comercializadora"
          ayuda="Solo si tienes un dato documentado (por ejemplo, de tu contrato). Se aplica a la luz de casa y a la carga del coche."
          valor={formulario.general.factorElectricoPersonalizado}
          onCambio={(factorElectricoPersonalizado) => actualizar('general', { factorElectricoPersonalizado })}
          unidad="kg CO₂e/kWh"
          max={2}
        />
      </MasOpciones>
    </Paso>
  );
}

import { useCalculadora } from '../CalculadoraContext.jsx';
import { Bloque, CampoNumero, MasOpciones, Opciones, Selector } from '../components/Campos.jsx';
import Paso from '../components/Paso.jsx';

const AYUDAS = {
  comida_bebida: 'Lo que gastas en el súper, el mercado o la tienda. Si compras para toda la casa, pon solo tu parte.',
  restaurantes: 'Comidas y cenas fuera de casa, también a domicilio.',
  bares_cafeterias_desayunos: 'Cafés, desayunos, cañas y tapas.',
  ropa_textiles_calzado: 'Ropa, zapatos y textiles del hogar.',
  computadoras: 'Precio del móvil, ordenador o tablet que usas ahora. Se reparte entre los años que te dura.',
  actividades_recreativas: 'Cine, conciertos, gimnasio, deporte, museos…',
};

function Gasto({ categoria, gasto, simbolo, frecuencias, onCambio }) {
  if (categoria.tipo === 'duradero') {
    return (
      <CampoNumero
        etiqueta={categoria.etiqueta}
        ayuda={`${AYUDAS[categoria.id] ?? 'Precio de compra. Se reparte entre los años que te dura.'} Si no sabes cuántos años, usamos ${categoria.vidaUtilPorDefecto}.`}
        valor={gasto.importe ?? ''}
        onCambio={(importe) => onCambio({ importe })}
        unidad={simbolo}
        ancho="max-w-[15rem]"
        junto={(
          <CampoNumero
            etiqueta={<span className="sr-only">Años que te dura: {categoria.etiqueta.toLowerCase()}</span>}
            valor={gasto.vidaUtil ?? ''}
            placeholder={String(categoria.vidaUtilPorDefecto)}
            onCambio={(vidaUtil) => onCambio({ vidaUtil })}
            unidad="años de uso"
            ancho="w-44"
            max={50}
          />
        )}
      />
    );
  }
  return (
    <CampoNumero
      etiqueta={categoria.etiqueta}
      ayuda={AYUDAS[categoria.id]}
      valor={gasto.importe ?? ''}
      onCambio={(importe) => onCambio({ importe })}
      unidad={simbolo}
      ancho="max-w-[15rem]"
      junto={(
        <Selector
          etiqueta={<span className="sr-only">Frecuencia de {categoria.etiqueta.toLowerCase()}</span>}
          valor={gasto.frecuencia ?? 'mensual'}
          opciones={frecuencias}
          onCambio={(frecuencia) => onCambio({ frecuencia })}
          ancho="w-40"
        />
      )}
    />
  );
}

export default function ProductosPage() {
  const { formulario, actualizar, catalogo } = useCalculadora();
  const productos = formulario.productos;
  const opciones = catalogo.data?.productos;
  const simbolo = productos.moneda === 'USD' ? 'US$' : '€';

  const cambiarGasto = (id, cambio) => actualizar('productos', (actual) => ({
    ...actual,
    gastos: { ...actual.gastos, [id]: { frecuencia: 'mensual', ...actual.gastos[id], ...cambio } },
  }));

  const gastoDe = (categoria) => (
    <Gasto
      key={categoria.id}
      categoria={categoria}
      gasto={productos.gastos[categoria.id] ?? {}}
      simbolo={simbolo}
      frecuencias={opciones.frecuencias}
      onCambio={(cambio) => cambiarGasto(categoria.id, cambio)}
    />
  );

  return (
    <Paso
      modulo="productos"
      titulo="Lo que consumes"
      intro="Todo lo que compramos tiene una huella al fabricarse y transportarse. Con importes aproximados es suficiente: es la parte más orientativa de la calculadora."
      nota="Factores monetarios de ADEME (kg CO₂e por euro gastado). No incluyas aquí la energía de casa, el combustible ni los billetes de transporte."
    >
      {opciones && (
        <>
          <Bloque titulo="¿Cómo comes?" descripcion="Ajusta la huella de tu comida según tu dieta habitual.">
            <Opciones
              etiqueta={<span className="sr-only">Perfil alimentario</span>}
              opciones={opciones.dietas.map(({ id, etiqueta }) => ({ id, etiqueta: id === 'no_especificar' ? 'Prefiero no decirlo' : etiqueta }))}
              valor={productos.dieta}
              onCambio={(dieta) => actualizar('productos', { dieta })}
              compacto
            />
          </Bloque>

          <Bloque
            titulo="Tus gastos habituales"
            descripcion="Pon solo tu parte de los gastos de casa. Deja vacío lo que no gastes."
            accion={(
              <Selector
                etiqueta={<span className="sr-only">Moneda</span>}
                valor={productos.moneda}
                opciones={[{ id: 'EUR', etiqueta: 'Euros (€)' }, { id: 'USD', etiqueta: 'Dólares (US$)' }]}
                onCambio={(moneda) => actualizar('productos', { moneda })}
                ancho="w-40"
              />
            )}
          >
            {opciones.categorias.filter(({ principal }) => principal).map(gastoDe)}
            <MasOpciones titulo="Otros gastos (muebles, seguros, educación…)">
              {opciones.categorias.filter(({ principal }) => !principal).map(gastoDe)}
            </MasOpciones>
          </Bloque>
        </>
      )}
    </Paso>
  );
}

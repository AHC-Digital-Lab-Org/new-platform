import { crearPartida, incertidumbreDato, sumarPartidas } from './incertidumbre.js';

// Categorías de la calculadora AHC 1.2 (factores monetarios ADEME). `principal` marca las que se
// preguntan siempre; el resto aparece en «Otros gastos» para no alargar el formulario.
export const CATEGORIAS_PRODUCTOS = [
  { id: 'comida_bebida', etiqueta: 'Comida y bebida', principal: true },
  { id: 'restaurantes', etiqueta: 'Restaurantes, comidas y cenas fuera', principal: true },
  { id: 'bares_cafeterias_desayunos', etiqueta: 'Bares, cafeterías y desayunos', principal: true },
  { id: 'ropa_textiles_calzado', etiqueta: 'Ropa, textiles y calzado', principal: true },
  { id: 'computadoras', etiqueta: 'Móvil, ordenador y equipos informáticos', principal: true },
  { id: 'actividades_recreativas', etiqueta: 'Ocio, cultura y deporte', principal: true },
  { id: 'television_radio_telefono', etiqueta: 'Televisión, radio y equipos audiovisuales' },
  { id: 'muebles_otros', etiqueta: 'Muebles y otros productos manufacturados' },
  { id: 'vehiculos_motor', etiqueta: 'Compra de vehículos (sin combustible ni uso)' },
  { id: 'papel', etiqueta: 'Libros, revistas y prensa en papel' },
  { id: 'alojamientos_ocasionales', etiqueta: 'Alojamientos ocasionales (hoteles, apartamentos)' },
  { id: 'llamadas_telefonicas', etiqueta: 'Telefonía e internet (servicios)' },
  { id: 'servicios_hogar', etiqueta: 'Servicios del hogar (mantenimiento, seguridad)' },
  { id: 'seguro', etiqueta: 'Seguros' },
  { id: 'banca_finanzas', etiqueta: 'Comisiones bancarias y financieras' },
  { id: 'educacion', etiqueta: 'Educación' },
];

export const FRECUENCIAS = { mensual: 'al mes', semanal: 'a la semana', diario: 'al día', anual: 'al año' };

const INCERTIDUMBRE_POR_FRECUENCIA = {
  diario: 'gasto_diario_recurrente',
  semanal: 'gasto_semanal_recurrente',
  mensual: 'gasto_mensual_recurrente',
  anual: 'gasto_anual_recurrente',
};

const etiquetaDe = (id) => CATEGORIAS_PRODUCTOS.find((categoria) => categoria.id === id).etiqueta;

/**
 * Huella anual de consumo con factores monetarios: gasto en € (ajustado a base del factor) × kgCO₂e/€.
 * Gastos recurrentes se anualizan por frecuencia; productos duraderos se reparten por vida útil.
 */
export function calcularProductos(entrada, { factores }) {
  const { productos } = factores;
  const { moneda = 'EUR', dieta = 'no_especificar', gastos = {} } = entrada;
  const aEuros = productos.moneda_entrada.monedas[moneda].factor_a_eur;
  const coeficienteDefecto = productos.ajuste_precio_base.coeficiente_defecto;

  const partidas = Object.entries(gastos)
    .filter(([, gasto]) => gasto && gasto.importe > 0)
    .map(([id, gasto]) => {
      const factor = productos.factores[id];
      const eurosBase = gasto.importe * aEuros * (factor.coeficiente_gasto_final_a_base_factor ?? coeficienteDefecto);

      if (factor.tipo === 'producto_duradero') {
        const vidaUtil = gasto.vidaUtil ?? productos.vida_util_por_defecto_anios[id].valor;
        return crearPartida({
          id,
          etiqueta: etiquetaDe(id),
          kg: (eurosBase * factor.valor) / vidaUtil,
          relativas: [
            incertidumbreDato(factores, 'importe_producto_duradero'),
            incertidumbreDato(factores, 'vida_util_producto_duradero'),
            factor.incertidumbre_relativa_factor,
          ],
          detalle: { vidaUtil },
        });
      }

      const frecuencia = gasto.frecuencia ?? 'mensual';
      const modulador = id === 'comida_bebida' ? productos.moduladores_dieta_alimentaria.opciones[dieta] : null;
      return crearPartida({
        id,
        etiqueta: etiquetaDe(id),
        kg: eurosBase * productos.frecuencias[frecuencia].valor * factor.valor * (modulador?.valor ?? 1),
        relativas: [
          incertidumbreDato(factores, INCERTIDUMBRE_POR_FRECUENCIA[frecuencia]),
          modulador?.incertidumbre_relativa_factor_ajustada ?? factor.incertidumbre_relativa_factor,
        ],
      });
    });

  return { modulo: 'productos', ...sumarPartidas(partidas), partidas };
}

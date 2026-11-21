import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { useFetch } from '@/shared/hooks/useFetch.js';
import { calcularModulo, getFactores } from './api.js';

export const MODULOS = ['vivienda', 'transporte', 'vuelos', 'productos'];
export const PERIODOS = {
  semana: { etiqueta: 'a la semana', corto: 'km/sem.', porAnio: 52 },
  mes: { etiqueta: 'al mes', corto: 'km/mes', porAnio: 12 },
  anio: { etiqueta: 'al año', corto: 'km/año', porAnio: 1 },
};

const CLAVE_ALMACEN = 'calculadora-huella:v1';
const ESPERA_CALCULO_MS = 450;

let siguienteId = 1;
export const nuevoViaje = () => ({
  id: `v${Date.now()}-${siguienteId++}`,
  modo: 'aeropuertos',
  origen: '',
  destino: '',
  km: '',
  horas: '',
  clase: 'economica',
  itinerario: 'ida_y_vuelta',
  veces: '1',
});

export const formularioInicial = () => ({
  general: { pais: 'españa', factorElectricoPersonalizado: '' },
  vivienda: {
    personas: 2,
    origenDato: 'factura',
    calefaccion: [],
    consumos: {
      electricidad: { valor: '', unidad: 'kWh_anual' },
      gas: { valor: '', unidad: 'kWh_anual' },
      gasoleo: { valor: '', unidad: 'litros_anual' },
      glp: { valor: '', unidad: 'litros_anual' },
      propano: { valor: '', unidad: 'kg_anual' },
      pellets: { valor: '', unidad: 'kg_anual' },
      carbon: { valor: '', unidad: 'kg_anual' },
    },
    excedenteFotovoltaico: '',
  },
  transporte: {
    usaCoche: false,
    coche: {
      km: '', periodo: 'semana', energia: 'gasolina', consumo: '', ocupacion: '1',
      origenConsumoElectrico: 'no_se', cargaIncluidaVivienda: 'no', porcentajeCargaIncluida: '',
      combustibleTermico: 'gasolina', porcentajeKmElectrico: '50', consumoCombustible: '',
    },
    usaMoto: false,
    moto: { km: '', periodo: 'semana', tipo: 'moto_pequena' },
    publico: { periodo: 'semana', bus_urbano: '', autocar_interurbano: '', tren: '', tipoTren: 'tren_nacional', tranvia: '', metro: '', taxi_vtc: '' },
  },
  vuelos: { sinVuelos: false, criterio: 'ampliado', viajes: [] },
  productos: { moneda: 'EUR', dieta: 'no_especificar', gastos: {} },
});

/** Convierte lo escrito en un campo a número. Acepta coma decimal; '' es «sin dato». */
export const aNumero = (texto) => {
  const limpio = String(texto ?? '').trim().replace(/\s/g, '').replace(',', '.');
  if (limpio === '') return undefined;
  const numero = Number(limpio);
  return Number.isFinite(numero) ? numero : Number.NaN;
};

const positivo = (texto) => {
  const numero = aNumero(texto);
  return numero > 0 ? numero : undefined;
};

const anual = (texto, periodo) => {
  const numero = positivo(texto);
  return numero === undefined ? undefined : numero * PERIODOS[periodo].porAnio;
};

// Constructores del cuerpo de la API a partir del formulario. Los campos vacíos no se envían.
export const aDatosApi = {
  general: ({ pais, factorElectricoPersonalizado }) => ({
    pais,
    ...(positivo(factorElectricoPersonalizado) !== undefined ? { factorElectricoPersonalizado: positivo(factorElectricoPersonalizado) } : {}),
  }),
  vivienda: (vivienda) => {
    const fuentes = ['electricidad', ...vivienda.calefaccion];
    const consumos = Object.fromEntries(fuentes
      .map((fuente) => [fuente, vivienda.consumos[fuente]])
      .filter(([, consumo]) => positivo(consumo.valor) !== undefined)
      .map(([fuente, consumo]) => [fuente, { valor: positivo(consumo.valor), unidad: consumo.unidad }]));
    return {
      personas: vivienda.personas,
      origenDato: vivienda.origenDato,
      consumos,
      excedenteFotovoltaicoKWh: positivo(vivienda.excedenteFotovoltaico) ?? 0,
    };
  },
  transporte: ({ usaCoche, coche, usaMoto, moto, publico }) => {
    const datos = {};
    const kmCoche = anual(coche.km, coche.periodo);
    if (usaCoche && kmCoche) {
      datos.coche = {
        km: kmCoche,
        energia: coche.energia,
        consumo: aNumero(coche.consumo) ?? coche.consumoOrientativo,
        ocupacion: aNumero(coche.ocupacion) || 1,
        origenConsumoElectrico: coche.origenConsumoElectrico,
        cargaIncluidaVivienda: coche.cargaIncluidaVivienda,
        porcentajeCargaIncluida: aNumero(coche.porcentajeCargaIncluida) || 0,
        ...(coche.energia === 'hibrido_enchufable'
          ? {
            enchufable: {
              combustibleTermico: coche.combustibleTermico,
              porcentajeKmElectrico: aNumero(coche.porcentajeKmElectrico) ?? 0,
              consumoCombustible: aNumero(coche.consumoCombustible) ?? coche.consumoCombustibleOrientativo,
            },
          }
          : {}),
      };
    }
    const kmMoto = anual(moto.km, moto.periodo);
    if (usaMoto && kmMoto) datos.moto = { km: kmMoto, tipo: moto.tipo };
    const modos = ['bus_urbano', 'autocar_interurbano', 'tren', 'tranvia', 'metro', 'taxi_vtc']
      .map((modo) => [modo, anual(publico[modo], publico.periodo)])
      .filter(([, km]) => km !== undefined);
    if (modos.length) datos.publico = { ...Object.fromEntries(modos), tipoTren: publico.tipoTren };
    return datos;
  },
  vuelos: ({ sinVuelos, criterio, viajes }) => ({
    criterio,
    viajes: sinVuelos ? [] : viajes
      .map((viaje) => {
        const tramo = {
          aeropuertos: viaje.origen && viaje.destino ? { modo: 'aeropuertos', origen: viaje.origen, destino: viaje.destino } : null,
          km: positivo(viaje.km) ? { modo: 'km', km: positivo(viaje.km) } : null,
          horas: positivo(viaje.horas) ? { modo: 'horas', horas: positivo(viaje.horas) } : null,
        }[viaje.modo];
        return tramo && {
          clase: viaje.clase,
          itinerario: viaje.itinerario,
          veces: Math.max(1, Math.round(aNumero(viaje.veces) || 1)),
          tramos: [tramo],
        };
      })
      .filter(Boolean),
  }),
  productos: ({ moneda, dieta, gastos }) => ({
    moneda,
    dieta,
    gastos: Object.fromEntries(Object.entries(gastos)
      .filter(([, gasto]) => positivo(gasto.importe) !== undefined)
      .map(([id, gasto]) => [id, {
        importe: positivo(gasto.importe),
        ...(gasto.frecuencia ? { frecuencia: gasto.frecuencia } : {}),
        ...(positivo(gasto.vidaUtil) !== undefined ? { vidaUtil: positivo(gasto.vidaUtil) } : {}),
      }])),
  }),
};

/** Cuerpo de POST /calcular con los módulos que la persona ya ha visitado. */
export const construirEntrada = (formulario, visitados) => ({
  general: aDatosApi.general(formulario.general),
  ...Object.fromEntries(MODULOS.filter((modulo) => visitados.includes(modulo))
    .map((modulo) => [modulo, aDatosApi[modulo](formulario[modulo])])),
});

const leerAlmacen = () => {
  try {
    const guardado = JSON.parse(sessionStorage.getItem(CLAVE_ALMACEN));
    if (guardado?.formulario) return { formulario: { ...formularioInicial(), ...guardado.formulario }, visitados: guardado.visitados ?? [] };
  } catch {
    // Almacenamiento no disponible (modo privado estricto): se empieza de cero.
  }
  return { formulario: formularioInicial(), visitados: [] };
};

const CalculadoraContext = createContext(null);

export function CalculadoraProvider({ children }) {
  const catalogo = useFetch(() => getFactores(), []);
  const [{ formulario, visitados }, setEstado] = useState(leerAlmacen);
  const [resultados, setResultados] = useState({});
  const [errores, setErrores] = useState({});
  const temporizadores = useRef({});
  const ultimos = useRef({});

  useEffect(() => {
    try {
      sessionStorage.setItem(CLAVE_ALMACEN, JSON.stringify({ formulario, visitados }));
    } catch {
      // Sin almacenamiento la calculadora sigue funcionando durante la visita.
    }
  }, [formulario, visitados]);

  const actualizar = useCallback((seccion, cambio) => {
    setEstado((estado) => ({
      ...estado,
      formulario: {
        ...estado.formulario,
        [seccion]: typeof cambio === 'function' ? cambio(estado.formulario[seccion]) : { ...estado.formulario[seccion], ...cambio },
      },
    }));
  }, []);

  const marcarVisitado = useCallback((modulo) => {
    setEstado((estado) => (estado.visitados.includes(modulo) ? estado : { ...estado, visitados: [...estado.visitados, modulo] }));
  }, []);

  const reiniciar = useCallback(() => {
    setEstado({ formulario: formularioInicial(), visitados: [] });
    setResultados({});
    setErrores({});
    ultimos.current = {};
  }, []);

  // Cálculo en vivo de cada módulo visitado: espera a que la persona deje de escribir y el backend calcula.
  const general = useMemo(() => aDatosApi.general(formulario.general), [formulario.general]);
  useEffect(() => {
    for (const modulo of MODULOS) {
      if (!visitados.includes(modulo)) continue;
      const datos = aDatosApi[modulo](formulario[modulo]);
      const clave = JSON.stringify({ datos, general });
      if (ultimos.current[modulo] === clave) continue;
      ultimos.current[modulo] = clave;
      clearTimeout(temporizadores.current[modulo]);
      temporizadores.current[modulo] = setTimeout(() => {
        calcularModulo(modulo, datos, general)
          .then((resultado) => {
            if (ultimos.current[modulo] !== clave) return;
            setResultados((actuales) => ({ ...actuales, [modulo]: resultado }));
            setErrores((actuales) => ({ ...actuales, [modulo]: null }));
          })
          .catch((error) => {
            if (ultimos.current[modulo] !== clave) return;
            setErrores((actuales) => ({ ...actuales, [modulo]: error }));
          });
      }, ESPERA_CALCULO_MS);
    }
  }, [formulario, visitados, general]);

  // Al desmontar se cancelan los cálculos pendientes y se olvida lo enviado, para recalcular al volver.
  useEffect(() => () => {
    Object.values(temporizadores.current).forEach(clearTimeout);
    ultimos.current = {};
  }, []);

  const totalEnVivoKg = MODULOS.reduce((suma, modulo) => suma + (resultados[modulo]?.totalKg ?? 0), 0);

  const valor = useMemo(() => ({
    catalogo,
    formulario,
    visitados,
    resultados,
    errores,
    totalEnVivoKg,
    actualizar,
    marcarVisitado,
    reiniciar,
  }), [catalogo, formulario, visitados, resultados, errores, totalEnVivoKg, actualizar, marcarVisitado, reiniciar]);

  return <CalculadoraContext.Provider value={valor}>{children}</CalculadoraContext.Provider>;
}

export function useCalculadora() {
  const contexto = useContext(CalculadoraContext);
  if (!contexto) throw new Error('useCalculadora debe usarse dentro de CalculadoraProvider');
  return contexto;
}

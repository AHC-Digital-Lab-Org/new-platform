# Módulo `calculadora` (backend)

Calcula la huella de carbono personal anual (kg CO₂e/año) con la metodología y los factores de la
calculadora de la Asociación Huella de Carbono (versión 1.2). Los endpoints no guardan nada: reciben los datos,
calculan y responden. Los módulos se pueden enviar por separado o todos juntos.

## Endpoints

| Método | Ruta | Uso |
| --- | --- | --- |
| `POST` | `/api/calculadora/calcular` | Calcula los módulos enviados y devuelve el total, la incertidumbre, la comparación nacional, el indicador de planetas y los gestos de reducción. |
| `POST` | `/api/calculadora/calcular/:modulo` | Calcula un único módulo (`vivienda`, `transporte`, `vuelos` o `productos`). Lo usa el frontend para el resultado en vivo de cada paso. |
| `GET` | `/api/calculadora/factores` | Catálogos del formulario: países, aeropuertos, energías del coche, categorías de consumo y fuentes. |

La documentación completa, con ejemplos, está en Swagger (`/api/docs`).

Los tres endpoints son públicos y usan `calculadoraLimiter` (`middleware/rate-limit.middleware.js`): 120 peticiones
por minuto e IP, más holgado que el de `auth` porque el frontend recalcula en vivo mientras se escribe. Al superarlo
responden `429 TOO_MANY_REQUESTS`.

## Estructura

```text
calculadora/
├── calculadora.routes.js      rutas + @openapi
├── calculadora.schema.js      Zod .strict(), un esquema por módulo
├── calculadora.controller.js
├── calculadora.service.js     carga los datos, resuelve el factor eléctrico, orquesta, compara y propone gestos
├── data/                      factores versionados (no se editan desde el código)
├── modulos/                   funciones puras: (datos, contexto) → { totalKg, incertidumbreKg, partidas }
│   ├── vivienda.js            consumo del hogar × factor ÷ personas; excedente FV aparte
│   ├── transporte.js          coche (L o kWh/100 km ÷ ocupación), moto y transporte público por pasajero-km
│   ├── vuelos.js              km × factor por distancia × clase × itinerario × veces; lectura directa y ampliada (no-CO₂)
│   ├── productos.js           gasto × coeficiente precio-base × kg CO₂e/€; duraderos ÷ vida útil
│   └── incertidumbre.js       propagación σ relativa (producto) y absoluta (suma)
└── __tests__/
```

`modulos/incertidumbre.js` no estaba en la propuesta: concentra la propagación de incertidumbre que usan los cuatro módulos.

## Datos (`data/`)

| Fichero | Origen |
| --- | --- |
| `reference_factors.json` | Copia literal de la calculadora AHC 1.2, más un bloque nuevo `indicador_planetas` al final. |
| `electricity_country_factors.json` | Copia literal (Ember 2024, factor de red por país). |
| `national_emissions_references.json` | Copia literal (Worldometer / EDGAR 2024, CO₂ territorial por persona). |
| `vuelos.json` | Copia literal (160 aeropuertos con coordenadas). |
| `vehiculos.json` | Nuevo. Sustituye a `coches.json` (que no se usaba en el cálculo): energías del coche, tipos de moto y consumos orientativos. |

No se traen `cities.json` (7,6 MB) ni `model_registry.json` (documentación metodológica).

### Valores pendientes de validar por AHC

- `indicador_planetas.presupuesto_kgCO2e_persona_anio = 2500`: objetivo 2030 compatible con 1,5 °C (IGES, Aalto
  University y D-mat, 2019). Es orientativo; no es la huella ecológica de Global Footprint Network.
- `vehiculos.json → consumo_orientativo`: consumos medios que se usan cuando la persona no conoce el de su coche.

## Decisiones respecto a la calculadora AHC

- Mismas fórmulas, factores, conversiones e incertidumbres. El factor eléctrico personalizado se aplica a vivienda
  y coche; los excedentes fotovoltaicos siguen usando el factor medio de red.
- Vuelos: se aceptan aeropuertos IATA, kilómetros u horas (no ciudades, para no cargar `cities.json`).
- Gestos («Tu granito de arena»): se recalcula el módulo con un cambio sencillo (compartir coche, menos carne,
  10 % menos de luz…). El ahorro sale de la misma metodología; no añade factores nuevos.

## Pruebas

```bash
npm test --workspace backend
```

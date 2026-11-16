# Módulo `calculadora` (frontend)

Calculadora de huella de carbono personal en `/calculadora`. Va en seis pasos: inicio, vivienda, transporte,
vuelos, consumo y resultados. Todo el cálculo lo hace el backend (`/api/calculadora`); la interfaz solo recoge
datos y los presenta.

## Flujo

- **Estado entre pasos:** `CalculadoraContext.jsx` guarda el formulario en `sessionStorage`. Se conserva al
  recargar la página y se borra al cerrar la pestaña.
- **Resultado en vivo:** al cambiar un dato de un paso ya visitado, el contexto espera 450 ms y llama a
  `POST /calcular/:modulo`. El total aparece en la barra de pasos y el desglose en el panel lateral del paso.
- **Resultados:** `POST /calcular` con los apartados visitados. Incluye total ± margen, planetas, comparación con
  la media del país, desglose y gestos que se pueden marcar para ver la huella que quedaría.
- **Informe:** el botón «Imprimir o guardar en PDF» usa `@media print` (definido en `calculadora.css`).

## Estructura

```text
calculadora/
├── index.jsx                  rutas lazy + proveedor + barra de pasos
├── api.js                     usa @/shared/api/client.js
├── CalculadoraContext.jsx     estado, conversión formulario → API y cálculo en vivo
├── calculadora.css            tokens de color, tipografía, animación e impresión (solo dentro de .calculadora)
├── pages/                     Bienvenida, Vivienda, Transporte, Vuelos, Productos, Resultados
├── components/
│   ├── StepProgress.jsx       camino de pasos con total en vivo
│   ├── ResultadoGrafico.jsx   cinta por apartados, tabla y planetas
│   ├── Paso.jsx               plantilla de cada paso (escena, preguntas, panel de resultado, navegación)
│   ├── Campos.jsx             campos accesibles: número con coma decimal, chips, interruptor, desplegable
│   └── Escena.jsx             ilustraciones SVG propias de cada paso e iconos
└── __tests__/
```

`Paso.jsx`, `Campos.jsx`, `Escena.jsx` y `calculadora.css` no estaban en la propuesta. Se añadieron para no
repetir la plantilla y los campos en cada página.

## Facilidad de uso

- Los kilómetros se pueden indicar por semana, por mes o por año.
- Si no sabes el consumo del coche, se usa un valor medio orientativo.
- Los números aceptan coma decimal («1,5»).
- Las opciones avanzadas (placas solares, factor eléctrico propio, carga del coche eléctrico, otros gastos) están
  plegadas.

## Estilo

Paleta de bosque, hoja, tierra y cielo sobre un fondo claro cálido, con contraste AA. Los títulos usan
Bricolage Grotesque, alojada en el proyecto con `@fontsource-variable/bricolage-grotesque` (sin pedirla a
Google Fonts). Cada paso tiene una escena ilustrada en SVG y la animación respeta `prefers-reduced-motion`.

## Pruebas

```bash
npm test --workspace frontend
```

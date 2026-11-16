// Punto de entrada del módulo: estado compartido entre pasos y subrutas cargadas bajo demanda.
import { lazy, Suspense } from 'react';
import { Navigate, Route, Routes } from 'react-router';
import { CalculadoraProvider } from './CalculadoraContext.jsx';
import StepProgress from './components/StepProgress.jsx';
import './calculadora.css';

const BienvenidaPage = lazy(() => import('./pages/BienvenidaPage.jsx'));
const ViviendaPage = lazy(() => import('./pages/ViviendaPage.jsx'));
const TransportePage = lazy(() => import('./pages/TransportePage.jsx'));
const VuelosPage = lazy(() => import('./pages/VuelosPage.jsx'));
const ProductosPage = lazy(() => import('./pages/ProductosPage.jsx'));
const ResultadosPage = lazy(() => import('./pages/ResultadosPage.jsx'));

export default function Calculadora() {
  return (
    <CalculadoraProvider>
      <div className="calculadora -mx-2 rounded-[2.5rem] bg-(--c-fondo) px-4 py-6 sm:mx-0 sm:px-8 sm:py-8">
        <StepProgress />
        <Suspense fallback={<p className="mt-10 text-(--c-tinta-suave)" role="status">Cargando…</p>}>
          <Routes>
            <Route index element={<BienvenidaPage />} />
            <Route path="vivienda" element={<ViviendaPage />} />
            <Route path="transporte" element={<TransportePage />} />
            <Route path="vuelos" element={<VuelosPage />} />
            <Route path="productos" element={<ProductosPage />} />
            <Route path="resultados" element={<ResultadosPage />} />
            <Route path="*" element={<Navigate to="." replace />} />
          </Routes>
        </Suspense>
      </div>
    </CalculadoraProvider>
  );
}

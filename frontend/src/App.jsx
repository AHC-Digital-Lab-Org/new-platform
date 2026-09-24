import { Suspense } from 'react';
import { Route, Routes } from 'react-router';
import Layout from '@/shared/components/Layout.jsx';
import HomePage from '@/pages/HomePage.jsx';
import NotFoundPage from '@/pages/NotFoundPage.jsx';
import { modules } from '@/modules/index.js';

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<HomePage />} />
        {/* Cada módulo gestiona sus propias subrutas bajo /<path>/* */}
        {modules.map(({ path, Component }) => (
          <Route
            key={path}
            path={`${path}/*`}
            element={
              <Suspense fallback={<p className="text-slate-500">Cargando…</p>}>
                <Component />
              </Suspense>
            }
          />
        ))}
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
}

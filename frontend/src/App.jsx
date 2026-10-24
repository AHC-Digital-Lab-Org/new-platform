import { Suspense } from 'react';
import { Route, Routes } from 'react-router';
import Layout from '@/shared/components/Layout.jsx';
import HomePage from '@/pages/HomePage.jsx';
import NotFoundPage from '@/pages/NotFoundPage.jsx';
import { RequireAuth } from '@/modules/auth/guards.jsx';
import { modules } from '@/modules/index.js';

const page = (Component, guard) => {
  const content = (
    <Suspense fallback={<p className="text-slate-500">Cargando…</p>}>
      <Component />
    </Suspense>
  );
  return guard === 'auth' ? <RequireAuth>{content}</RequireAuth> : content;
};

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<HomePage />} />
        {modules.flatMap(({ path, Component, routes }) =>
          routes
            ? routes.map((route) => (
                <Route
                  key={route.path}
                  path={route.path}
                  element={page(route.Component, route.guard)}
                />
              ))
            : [
                <Route
                  key={path}
                  path={`${path}/*`}
                  element={page(Component)}
                />,
              ],
        )}
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
}

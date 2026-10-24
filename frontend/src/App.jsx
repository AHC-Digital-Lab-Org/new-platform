import { Suspense } from 'react';
import { Route, Routes } from 'react-router';
import Layout from '@/shared/components/Layout.jsx';
import HomePage from '@/pages/HomePage.jsx';
import NotFoundPage from '@/pages/NotFoundPage.jsx';
import { RequireAuth, RequireRole } from '@/modules/auth/guards.jsx';
import { modules } from '@/modules/index.js';

const page = (Component, { guard, roles } = {}) => {
  let content = (
    <Suspense fallback={<p className="text-slate-500">Cargando…</p>}>
      <Component />
    </Suspense>
  );
  if (roles) content = <RequireRole roles={roles}>{content}</RequireRole>;
  if (guard === 'auth' || roles) {
    content = <RequireAuth>{content}</RequireAuth>;
  }
  return content;
};

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<HomePage />} />
        {modules.flatMap(({ path, Component, routes, guard, roles }) =>
          routes
            ? routes.map((route) => (
                <Route
                  key={route.path}
                  path={route.path}
                  element={page(route.Component, route)}
                />
              ))
            : [
                <Route
                  key={path}
                  path={`${path}/*`}
                  element={page(Component, { guard, roles })}
                />,
              ],
        )}
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
}

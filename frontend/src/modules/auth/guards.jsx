import { Navigate, Outlet, useLocation } from 'react-router';
import { useAuth } from './AuthContext.jsx';

export function RequireAuth({ children }) {
  const { status, retry } = useAuth();
  const location = useLocation();

  if (status === 'loading') {
    return (
      <p role="status" className="text-slate-500">
        Comprobando tu sesión…
      </p>
    );
  }
  if (status === 'error') {
    return (
      <div role="alert" className="rounded-md border border-red-300 bg-red-50 p-4 text-red-800">
        <p>No se pudo comprobar tu sesión. Revisa tu conexión.</p>
        <button
          type="button"
          onClick={retry}
          className="mt-2 rounded-md bg-emerald-700 px-3 py-1.5 text-sm font-medium text-white"
        >
          Reintentar
        </button>
      </div>
    );
  }
  if (status !== 'authenticated') {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }
  return children ?? <Outlet />;
}

export function RequireRole({ roles, children }) {
  const { user } = useAuth();
  if (!roles.includes(user?.tipoUsuario)) {
    return (
      <section role="alert">
        <h1 className="text-2xl font-bold">Acceso denegado</h1>
        <p className="mt-2 text-slate-600">
          No tienes permisos para ver esta página.
        </p>
      </section>
    );
  }
  return children ?? <Outlet />;
}

import { useRef } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router';
import { menuModules } from '@/modules/index.js';
import { useAuth } from '@/modules/auth/AuthContext.jsx';

const linkClass = ({ isActive }) =>
  `rounded-md px-3 py-2 text-sm font-medium ${isActive ? 'bg-emerald-700 text-white' : 'text-emerald-50 hover:bg-emerald-600'}`;

export default function Layout() {
  const { status, user, logout } = useAuth();
  const navigate = useNavigate();
  const mainRef = useRef(null);

  const onLogout = () => {
    logout();
    navigate('/');
  };

  const skipToContent = (event) => {
    event.preventDefault();
    mainRef.current?.focus();
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <a
        href="#contenido"
        onClick={skipToContent}
        className="sr-only focus:not-sr-only focus:absolute focus:left-2 focus:top-2 focus:z-10 focus:rounded-md focus:bg-white focus:px-3 focus:py-2 focus:text-emerald-800"
      >
        Saltar al contenido
      </a>
      <header className="bg-emerald-800">
        <nav aria-label="Principal" className="mx-auto flex max-w-6xl flex-wrap items-center gap-2 px-4 py-3">
          <NavLink to="/" end className="mr-4 font-bold text-white">
            Web Platform
          </NavLink>
          {menuModules.map(({ path, label }) => (
            <NavLink key={path} to={path} className={linkClass}>
              {label}
            </NavLink>
          ))}
          <div className="ml-auto flex items-center gap-2">
            {status === 'authenticated' && (
              <>
                <span className="text-sm text-emerald-50">Hola, {user.alias}</span>
                <NavLink to="/security" className={linkClass}>
                  Seguridad
                </NavLink>
                <button
                  type="button"
                  onClick={onLogout}
                  className="rounded-md px-3 py-2 text-sm font-medium text-emerald-50 hover:bg-emerald-600"
                >
                  Cerrar sesión
                </button>
              </>
            )}
            {status === 'anonymous' && (
              <>
                <NavLink to="/login" className={linkClass}>
                  Iniciar sesión
                </NavLink>
                <NavLink to="/register" className={linkClass}>
                  Crear cuenta
                </NavLink>
              </>
            )}
          </div>
        </nav>
      </header>
      <main
        id="contenido"
        ref={mainRef}
        tabIndex={-1}
        className="mx-auto max-w-6xl px-4 py-8 outline-none"
      >
        <Outlet />
      </main>
    </div>
  );
}

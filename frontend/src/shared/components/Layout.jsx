import { NavLink, Outlet } from 'react-router';
import { modules } from '@/modules/index.js';

const linkClass = ({ isActive }) =>
  `rounded-md px-3 py-2 text-sm font-medium ${isActive ? 'bg-emerald-700 text-white' : 'text-emerald-50 hover:bg-emerald-600'}`;

export default function Layout() {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <header className="bg-emerald-800">
        <nav className="mx-auto flex max-w-6xl items-center gap-2 px-4 py-3">
          <NavLink to="/" end className="mr-4 font-bold text-white">
            Web Platform
          </NavLink>
          {modules.map(({ path, label }) => (
            <NavLink key={path} to={path} className={linkClass}>
              {label}
            </NavLink>
          ))}
        </nav>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-8">
        <Outlet />
      </main>
    </div>
  );
}

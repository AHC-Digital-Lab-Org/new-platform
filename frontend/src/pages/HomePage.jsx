import { Link } from 'react-router';
import { modules } from '@/modules/index.js';

export default function HomePage() {
  return (
    <section>
      <h1 className="text-3xl font-bold">Bienvenido</h1>
      <p className="mt-2 text-slate-600">Selecciona un módulo para empezar.</p>
      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {modules.map(({ path, label }) => (
          <Link key={path} to={path} className="rounded-lg border bg-white p-6 shadow-sm hover:border-emerald-600">
            <h2 className="text-lg font-semibold">{label}</h2>
          </Link>
        ))}
      </div>
    </section>
  );
}

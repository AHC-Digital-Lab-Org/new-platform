import { Link } from 'react-router';

export default function ForbiddenPage() {
  return (
    <section role="alert" className="text-center">
      <h1 className="text-2xl font-bold">Acceso denegado</h1>
      <p className="mt-2 text-slate-600">
        No tienes permisos para ver esta página.
      </p>
      <Link to="/" className="mt-4 inline-block text-emerald-700 underline">
        Volver al inicio
      </Link>
    </section>
  );
}

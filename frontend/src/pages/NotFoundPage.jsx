import { Link } from 'react-router';

export default function NotFoundPage() {
  return (
    <section className="text-center">
      <h1 className="text-2xl font-bold">Página no encontrada</h1>
      <Link to="/" className="mt-4 inline-block text-emerald-700 underline">
        Volver al inicio
      </Link>
    </section>
  );
}

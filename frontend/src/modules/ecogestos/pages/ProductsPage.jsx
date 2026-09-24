import { Link } from 'react-router';
import { getProducts } from '../api.js';
import { formatPrice } from '../format.js';
import { useFetch } from '@/shared/hooks/useFetch.js';

export default function ProductsPage() {
  const { data, error, loading } = useFetch(() => getProducts(), []);

  return (
    <section>
      <h1 className="text-2xl font-bold">Tienda Ecogestos</h1>
      {loading && <p className="mt-4 text-slate-500">Cargando productos…</p>}
      {error && <p className="mt-4 text-red-600">{error.message}</p>}
      {data && (
        <ul className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {data.items.map((p) => (
            <li key={p.id}>
              <Link to={`products/${p.id}`} className="block rounded-lg border bg-white p-4 shadow-sm hover:border-emerald-600">
                <h2 className="font-semibold">{p.name}</h2>
                <p className="mt-1 text-emerald-700">{formatPrice(p.priceCents)}</p>
              </Link>
            </li>
          ))}
          {data.items.length === 0 && <p className="text-slate-500">No hay productos todavía.</p>}
        </ul>
      )}
    </section>
  );
}

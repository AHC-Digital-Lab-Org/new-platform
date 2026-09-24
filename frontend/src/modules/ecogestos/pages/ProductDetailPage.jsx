import { Link, useParams } from 'react-router';
import { getProduct } from '../api.js';
import { formatPrice } from '../format.js';
import { useFetch } from '@/shared/hooks/useFetch.js';

export default function ProductDetailPage() {
  const { id } = useParams();
  const { data: product, error, loading } = useFetch(() => getProduct(id), [id]);

  return (
    <section>
      <Link to=".." relative="path" className="text-sm text-emerald-700 underline">
        ← Volver a la tienda
      </Link>
      {loading && <p className="mt-4 text-slate-500">Cargando…</p>}
      {error && <p className="mt-4 text-red-600">{error.message}</p>}
      {product && (
        <article className="mt-4 rounded-lg border bg-white p-6 shadow-sm">
          <h1 className="text-2xl font-bold">{product.name}</h1>
          <p className="mt-2 text-xl text-emerald-700">{formatPrice(product.priceCents)}</p>
          {product.description && <p className="mt-4 text-slate-600">{product.description}</p>}
          <p className="mt-4 text-sm text-slate-500">Stock: {product.stock}</p>
        </article>
      )}
    </section>
  );
}

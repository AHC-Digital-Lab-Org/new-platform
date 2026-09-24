// Punto de entrada del módulo: define sus propias subrutas.
import { Route, Routes } from 'react-router';
import ProductsPage from './pages/ProductsPage.jsx';
import ProductDetailPage from './pages/ProductDetailPage.jsx';

export default function Ecogestos() {
  return (
    <Routes>
      <Route index element={<ProductsPage />} />
      <Route path="products/:id" element={<ProductDetailPage />} />
    </Routes>
  );
}

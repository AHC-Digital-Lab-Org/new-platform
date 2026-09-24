import { api } from '@/shared/api/client.js';

export const getProducts = (page = 1) => api(`/ecogestos/products?page=${page}`);
export const getProduct = (id) => api(`/ecogestos/products/${id}`);

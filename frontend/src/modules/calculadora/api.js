import { api } from '@/shared/api/client.js';

export const getFactores = () => api('/calculadora/factores');

export const calcularModulo = (modulo, datos, general) =>
  api(`/calculadora/calcular/${modulo}`, { method: 'POST', body: { general, datos } });

export const calcularHuella = (entrada) => api('/calculadora/calcular', { method: 'POST', body: entrada });

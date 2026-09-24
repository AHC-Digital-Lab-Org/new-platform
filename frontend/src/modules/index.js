// Registro de módulos del frontend. Cada módulo se carga bajo demanda (code splitting),
// así el código de un equipo no engorda la carga inicial del resto.
import { lazy } from 'react';

export const modules = [
  { path: '/ecogestos', label: 'Ecogestos', Component: lazy(() => import('./ecogestos/index.jsx')) },
  { path: '/chatbot', label: 'Chatbot', Component: lazy(() => import('./chatbot/index.jsx')) },
];

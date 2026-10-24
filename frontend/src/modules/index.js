// Registro de módulos del frontend. Cada módulo se carga bajo demanda (code splitting),
// así el código de un equipo no engorda la carga inicial del resto.
// Los módulos habituales viven bajo `path/*`; las páginas independientes declaran `routes`.
import { lazy } from 'react';

export const modules = [
  { path: '/ecogestos', label: 'Ecogestos', Component: lazy(() => import('./ecogestos/index.jsx')) },
  { path: '/chatbot', label: 'Chatbot', Component: lazy(() => import('./chatbot/index.jsx')) },
  {
    name: 'auth',
    showInMenu: false,
    routes: [
      { path: '/login', Component: lazy(() => import('./auth/pages/LoginPage.jsx')) },
      { path: '/register', Component: lazy(() => import('./auth/pages/RegisterPage.jsx')) },
      { path: '/verify-email', Component: lazy(() => import('./auth/pages/VerifyEmailPage.jsx')) },
      { path: '/resend-verification', Component: lazy(() => import('./auth/pages/ResendVerificationPage.jsx')) },
      { path: '/forgot-password', Component: lazy(() => import('./auth/pages/ForgotPasswordPage.jsx')) },
      { path: '/reset-password', Component: lazy(() => import('./auth/pages/ResetPasswordPage.jsx')) },
    ],
  },
];

export const menuModules = modules.filter((module) => module.showInMenu !== false);

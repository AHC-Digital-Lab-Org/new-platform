import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router';
import { RequireAuth, RequireRole } from './guards.jsx';
import { useAuth } from './AuthContext.jsx';

vi.mock('./AuthContext.jsx', () => ({ useAuth: vi.fn() }));

function LoginProbe() {
  const location = useLocation();
  return <p>login (desde {location.state?.from?.pathname})</p>;
}

const renderAt = (ui) =>
  render(
    <MemoryRouter initialEntries={['/privado']}>
      <Routes>
        <Route path="/login" element={<LoginProbe />} />
        <Route path="/privado" element={ui} />
      </Routes>
    </MemoryRouter>,
  );

afterEach(cleanup);

describe('RequireAuth', () => {
  it('mientras comprueba la sesión no muestra el contenido ni redirige', () => {
    useAuth.mockReturnValue({ status: 'loading' });
    renderAt(<RequireAuth>secreto</RequireAuth>);
    expect(screen.getByText('Comprobando tu sesión…')).toBeTruthy();
    expect(screen.queryByText('secreto')).toBeNull();
  });

  it('anónimo: redirige a /login recordando la ruta', () => {
    useAuth.mockReturnValue({ status: 'anonymous' });
    renderAt(<RequireAuth>secreto</RequireAuth>);
    expect(screen.getByText('login (desde /privado)')).toBeTruthy();
  });

  it('error de red: ofrece reintentar y no redirige', () => {
    useAuth.mockReturnValue({ status: 'error', retry: vi.fn() });
    renderAt(<RequireAuth>secreto</RequireAuth>);
    expect(screen.getByText('Reintentar')).toBeTruthy();
  });

  it('autenticado: muestra el contenido', () => {
    useAuth.mockReturnValue({
      status: 'authenticated',
      user: { tipoUsuario: 'usuario_registrado' },
    });
    renderAt(<RequireAuth>secreto</RequireAuth>);
    expect(screen.getByText('secreto')).toBeTruthy();
  });
});

describe('RequireRole', () => {
  it('bloquea a quien no tiene el rol', () => {
    useAuth.mockReturnValue({ user: { tipoUsuario: 'usuario_registrado' } });
    renderAt(<RequireRole roles={['admin']}>panel</RequireRole>);
    expect(screen.getByText('Acceso denegado')).toBeTruthy();
    expect(screen.queryByText('panel')).toBeNull();
  });

  it('deja pasar al rol correcto', () => {
    useAuth.mockReturnValue({ user: { tipoUsuario: 'admin' } });
    renderAt(<RequireRole roles={['admin']}>panel</RequireRole>);
    expect(screen.getByText('panel')).toBeTruthy();
  });
});

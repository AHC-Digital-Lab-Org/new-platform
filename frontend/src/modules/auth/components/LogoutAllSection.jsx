import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router';
import FormError from '@/shared/components/FormError.jsx';
import { useSubmit } from '@/shared/hooks/useSubmit.js';
import { useAuth } from '../AuthContext.jsx';
import { logoutAll } from '../api.js';
import { authErrorMessage } from '../errors.js';

export default function LogoutAllSection() {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const { submit, loading, error, clearError } = useSubmit(logoutAll);
  const [confirming, setConfirming] = useState(false);
  const confirmRef = useRef(null);

  useEffect(() => {
    if (confirming) confirmRef.current?.focus();
  }, [confirming]);

  const start = () => {
    clearError();
    setConfirming(true);
  };

  const confirm = async () => {
    const result = await submit();
    if (result.ok) {
      logout();
      navigate('/login', { replace: true, state: { loggedOutAll: true } });
    }
  };

  return (
    <section className="space-y-3 rounded-lg border bg-white p-6 shadow-sm">
      <h2 className="text-lg font-semibold">Cerrar todas las sesiones</h2>
      <p className="text-sm text-slate-600">
        Cierra tu sesión en todos los dispositivos, incluido este. Úsalo si has
        iniciado sesión en un equipo compartido o sospechas que alguien más ha
        accedido a tu cuenta.
      </p>
      <FormError message={authErrorMessage(error)} />
      {!confirming ? (
        <button
          type="button"
          onClick={start}
          className="rounded-md border border-red-700 px-4 py-2 font-medium text-red-700 hover:bg-red-50"
        >
          Cerrar todas las sesiones
        </button>
      ) : (
        <div className="flex flex-wrap items-center gap-3">
          <p className="text-sm font-medium">
            ¿Seguro? Tendrás que volver a iniciar sesión.
          </p>
          <button
            ref={confirmRef}
            type="button"
            onClick={confirm}
            disabled={loading}
            className="rounded-md bg-red-700 px-4 py-2 font-medium text-white disabled:opacity-50"
          >
            {loading ? 'Cerrando…' : 'Sí, cerrar todas'}
          </button>
          <button
            type="button"
            onClick={() => setConfirming(false)}
            disabled={loading}
            className="rounded-md px-4 py-2 font-medium text-slate-700 underline"
          >
            Cancelar
          </button>
        </div>
      )}
    </section>
  );
}

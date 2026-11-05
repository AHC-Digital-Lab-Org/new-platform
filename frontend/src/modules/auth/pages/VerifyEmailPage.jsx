import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router';
import { verifyEmail } from '../api.js';
import { authErrorMessage } from '../errors.js';

export default function VerifyEmailPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const started = useRef(false);
  const heading = useRef(null);
  const [state, setState] = useState(() => ({
    status: token ? 'verifying' : 'missing',
    error: null,
  }));

  const verify = useCallback(async () => {
    setState({ status: 'verifying', error: null });
    try {
      await verifyEmail(token);
      setState({ status: 'success', error: null });
    } catch (error) {
      setState({ status: 'error', error });
    }
  }, [token]);

  useEffect(() => {
    if (!token) {
      setState({ status: 'missing', error: null });
      return;
    }
    if (started.current === token) return;
    started.current = token;
    verify();
  }, [token, verify]);

  useEffect(() => {
    if (state.status !== 'verifying') heading.current?.focus();
  }, [state.status]);

  const { status, error } = state;
  const invalidLink =
    status === 'missing' || error?.code === 'INVALID_VERIFICATION_TOKEN';
  const titles = {
    verifying: 'Verificando tu email…',
    success: 'Email verificado',
    missing: 'Enlace incompleto',
    error: 'No se pudo verificar el email',
  };

  return (
    <section className="mx-auto max-w-md rounded-lg border bg-white p-6 shadow-sm">
      <h1 ref={heading} tabIndex={-1} className="text-2xl font-bold outline-none">
        {titles[status]}
      </h1>
      <div role="status" className="mt-3 text-slate-600">
        {status === 'verifying' && <p>Un momento, estamos comprobando el enlace.</p>}
        {status === 'success' && (
          <p>Tu cuenta está verificada. Ya puedes iniciar sesión.</p>
        )}
        {status === 'missing' && (
          <p>
            Al enlace le falta el código de verificación. Abre el enlace completo
            del correo.
          </p>
        )}
        {status === 'error' && (
          <p>
            {invalidLink
              ? 'El enlace no es válido o ha caducado. Si ya verificaste tu email, puedes iniciar sesión directamente.'
              : authErrorMessage(error)}
          </p>
        )}
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-4">
        {status === 'success' && (
          <Link
            to="/login"
            className="rounded-md bg-emerald-700 px-4 py-2 font-medium text-white"
          >
            Iniciar sesión
          </Link>
        )}
        {status === 'error' && !invalidLink && (
          <button
            type="button"
            onClick={verify}
            className="rounded-md bg-emerald-700 px-4 py-2 font-medium text-white"
          >
            Reintentar
          </button>
        )}
        {invalidLink && (
          <>
            <Link to="/resend-verification" className="text-emerald-700 underline">
              Solicitar un enlace nuevo
            </Link>
            <Link to="/login" className="text-emerald-700 underline">
              Iniciar sesión
            </Link>
          </>
        )}
      </div>
    </section>
  );
}

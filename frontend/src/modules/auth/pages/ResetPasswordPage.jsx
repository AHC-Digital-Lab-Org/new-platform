import { useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router';
import FormError from '@/shared/components/FormError.jsx';
import FormField from '@/shared/components/FormField.jsx';
import { useSubmit } from '@/shared/hooks/useSubmit.js';
import { useAuth } from '../AuthContext.jsx';
import { resetPassword } from '../api.js';
import { authErrorMessage, formatWait } from '../errors.js';
import { MIN_PASSWORD } from '../validation.js';

export default function ResetPasswordPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [token] = useState(() => searchParams.get('token'));
  const { isAuthenticated, logout } = useAuth();
  const { submit, loading, error, clearError, secondsLeft } =
    useSubmit(resetPassword);
  const [form, setForm] = useState({ password: '', confirm: '' });
  const [fieldErrors, setFieldErrors] = useState({});
  const [done, setDone] = useState(false);
  const refs = useRef({});
  const heading = useRef(null);

  useEffect(() => {
    if (searchParams.has('token')) setSearchParams({}, { replace: true });
  }, [searchParams, setSearchParams]);

  useEffect(() => {
    if (done) heading.current?.focus();
  }, [done]);

  const setField = (name) => (event) => {
    setForm((current) => ({ ...current, [name]: event.target.value }));
    setFieldErrors((current) => {
      const { [name]: _removed, ...rest } = current;
      return rest;
    });
  };

  const onSubmit = async (event) => {
    event.preventDefault();
    if (loading || secondsLeft > 0) return;

    const errors = {};
    if (form.password.length < MIN_PASSWORD) {
      errors.password = `La contraseña debe tener al menos ${MIN_PASSWORD} caracteres.`;
    }
    if (form.confirm !== form.password) {
      errors.confirm = 'Las contraseñas no coinciden.';
    }
    setFieldErrors(errors);
    const firstError = Object.keys(errors)[0];
    if (firstError) {
      refs.current[firstError]?.focus();
      return;
    }

    clearError();
    const result = await submit({ token, password: form.password });
    if (result.ok) {
      if (isAuthenticated) logout();
      setDone(true);
    }
  };

  if (done) {
    return (
      <section className="mx-auto max-w-md rounded-lg border bg-white p-6 shadow-sm">
        <h1 ref={heading} tabIndex={-1} className="text-2xl font-bold outline-none">
          Contraseña actualizada
        </h1>
        <p role="status" className="mt-3 text-slate-600">
          Ya puedes iniciar sesión con tu nueva contraseña. Por seguridad, se han
          cerrado todas tus sesiones abiertas.
        </p>
        <Link
          to="/login"
          className="mt-4 inline-block rounded-md bg-emerald-700 px-4 py-2 font-medium text-white"
        >
          Iniciar sesión
        </Link>
      </section>
    );
  }

  if (!token) {
    return (
      <section className="mx-auto max-w-md rounded-lg border bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-bold">Enlace incompleto</h1>
        <p className="mt-3 text-slate-600">
          Al enlace le falta el código de recuperación. Abre el enlace completo
          del correo o solicita uno nuevo.
        </p>
        <Link
          to="/forgot-password"
          className="mt-4 inline-block text-emerald-700 underline"
        >
          Solicitar un enlace nuevo
        </Link>
      </section>
    );
  }

  return (
    <section className="mx-auto max-w-md">
      <h1 className="text-2xl font-bold">Elige una contraseña nueva</h1>
      <form
        onSubmit={onSubmit}
        noValidate
        className="mt-4 space-y-4 rounded-lg border bg-white p-6 shadow-sm"
      >
        <FormField
          label="Nueva contraseña"
          type="password"
          name="password"
          autoComplete="new-password"
          required
          hint={`Mínimo ${MIN_PASSWORD} caracteres.`}
          value={form.password}
          onChange={setField('password')}
          error={fieldErrors.password}
          ref={(element) => {
            refs.current.password = element;
          }}
        />
        <FormField
          label="Repite la contraseña"
          type="password"
          name="confirm"
          autoComplete="new-password"
          required
          value={form.confirm}
          onChange={setField('confirm')}
          error={fieldErrors.confirm}
          ref={(element) => {
            refs.current.confirm = element;
          }}
        />
        <FormError message={authErrorMessage(error)} />
        {error?.code === 'INVALID_RESET_TOKEN' && (
          <p className="text-sm">
            <Link to="/forgot-password" className="text-emerald-700 underline">
              Solicitar un enlace nuevo
            </Link>
          </p>
        )}
        <button
          type="submit"
          disabled={loading || secondsLeft > 0}
          className="w-full rounded-md bg-emerald-700 px-4 py-2 font-medium text-white disabled:opacity-50"
        >
          {loading
            ? 'Guardando…'
            : secondsLeft > 0
              ? `Espera ${formatWait(secondsLeft)}`
              : 'Cambiar contraseña'}
        </button>
      </form>
    </section>
  );
}

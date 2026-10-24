import { useRef, useState } from 'react';
import { Link, Navigate, useLocation } from 'react-router';
import FormError from '@/shared/components/FormError.jsx';
import FormField from '@/shared/components/FormField.jsx';
import { useSubmit } from '@/shared/hooks/useSubmit.js';
import { useAuth } from '../AuthContext.jsx';
import RecoveryNotice from '../components/RecoveryNotice.jsx';
import TwoFactorStep from '../components/TwoFactorStep.jsx';
import { authErrorMessage, formatWait } from '../errors.js';
import { EMAIL_RE } from '../validation.js';

const TWO_FACTOR_EXPIRED =
  'La verificación en dos pasos ha caducado. Inicia sesión de nuevo.';

export default function LoginPage() {
  const { status, isAuthenticated, login, applySession } = useAuth();
  const location = useLocation();
  const { submit, loading, error, clearError, secondsLeft } = useSubmit(login);
  const [form, setForm] = useState({ email: '', password: '' });
  const [fieldErrors, setFieldErrors] = useState({});
  const [twoFactorToken, setTwoFactorToken] = useState(null);
  const [recoveryRemaining, setRecoveryRemaining] = useState(null);
  const [notice, setNotice] = useState(null);
  const refs = useRef({});

  const from = location.state?.from
    ? `${location.state.from.pathname}${location.state.from.search ?? ''}`
    : '/';

  if (recoveryRemaining !== null) {
    return <RecoveryNotice remaining={recoveryRemaining} to={from} />;
  }
  if (isAuthenticated) return <Navigate to={from} replace />;
  if (status === 'loading') return <p className="text-slate-500">Cargando…</p>;

  const onChange = (name) => (event) => {
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
    if (!EMAIL_RE.test(form.email.trim())) {
      errors.email = 'Introduce un email válido.';
    }
    if (!form.password) errors.password = 'Introduce tu contraseña.';
    setFieldErrors(errors);
    const firstError = Object.keys(errors)[0];
    if (firstError) {
      refs.current[firstError]?.focus();
      return;
    }

    clearError();
    setNotice(null);
    const result = await submit(form.email.trim(), form.password);
    if (result.ok && result.data.twoFactorRequired) {
      setForm((current) => ({ ...current, password: '' }));
      setTwoFactorToken(result.data.twoFactorToken);
    }
  };

  const onTwoFactorSuccess = ({ token, user, recoveryCodesRemaining: remaining }) => {
    if (typeof remaining === 'number') setRecoveryRemaining(remaining);
    applySession(token, user);
  };

  if (twoFactorToken) {
    return (
      <TwoFactorStep
        twoFactorToken={twoFactorToken}
        onSuccess={onTwoFactorSuccess}
        onExpired={() => {
          setTwoFactorToken(null);
          setNotice(TWO_FACTOR_EXPIRED);
        }}
        onBack={() => setTwoFactorToken(null)}
      />
    );
  }

  const bannerText =
    notice ??
    (location.state?.sessionExpired
      ? 'Tu sesión ha caducado. Inicia sesión de nuevo.'
      : null);

  return (
    <section className="mx-auto max-w-md">
      <h1 className="text-2xl font-bold">Iniciar sesión</h1>
      {bannerText && (
        <p
          role="status"
          className="mt-4 rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900"
        >
          {bannerText}
        </p>
      )}
      <form
        onSubmit={onSubmit}
        noValidate
        className="mt-4 space-y-4 rounded-lg border bg-white p-6 shadow-sm"
      >
        <FormField
          label="Email"
          type="email"
          name="email"
          autoComplete="email"
          required
          value={form.email}
          onChange={onChange('email')}
          error={fieldErrors.email}
          ref={(element) => {
            refs.current.email = element;
          }}
        />
        <FormField
          label="Contraseña"
          type="password"
          name="password"
          autoComplete="current-password"
          required
          value={form.password}
          onChange={onChange('password')}
          error={fieldErrors.password}
          ref={(element) => {
            refs.current.password = element;
          }}
        />
        <FormError message={authErrorMessage(error)} />
        {error?.code === 'EMAIL_NOT_VERIFIED' && (
          <p className="text-sm">
            <Link
              to="/resend-verification"
              state={{ email: form.email.trim() }}
              className="text-emerald-700 underline"
            >
              Reenviar el correo de verificación
            </Link>
          </p>
        )}
        <button
          type="submit"
          disabled={loading || secondsLeft > 0}
          className="w-full rounded-md bg-emerald-700 px-4 py-2 font-medium text-white disabled:opacity-50"
        >
          {loading
            ? 'Entrando…'
            : secondsLeft > 0
              ? `Espera ${formatWait(secondsLeft)}`
              : 'Entrar'}
        </button>
      </form>
      <p className="mt-4 text-center text-sm text-slate-600">
        <Link to="/forgot-password" className="text-emerald-700 underline">
          ¿Has olvidado tu contraseña?
        </Link>
      </p>
      <p className="mt-4 text-center text-sm text-slate-600">
        ¿No tienes cuenta?{' '}
        <Link to="/register" className="text-emerald-700 underline">
          Crear cuenta
        </Link>
      </p>
    </section>
  );
}

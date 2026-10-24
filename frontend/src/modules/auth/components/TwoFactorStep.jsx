import { useCallback, useEffect, useRef, useState } from 'react';
import FormError from '@/shared/components/FormError.jsx';
import FormField from '@/shared/components/FormField.jsx';
import { useSubmit } from '@/shared/hooks/useSubmit.js';
import { loginTwoFactor } from '../api.js';
import { authErrorMessage, formatWait } from '../errors.js';
import { normalizeSecondFactor } from '../validation.js';

export default function TwoFactorStep({
  twoFactorToken,
  onSuccess,
  onExpired,
  onBack,
}) {
  const action = useCallback(
    (code) => loginTwoFactor({ twoFactorToken, code }),
    [twoFactorToken],
  );
  const { submit, loading, error, clearError, secondsLeft } = useSubmit(action);
  const [code, setCode] = useState('');
  const [fieldError, setFieldError] = useState('');
  const heading = useRef(null);
  const codeRef = useRef(null);

  useEffect(() => {
    heading.current?.focus();
  }, []);

  const onSubmit = async (event) => {
    event.preventDefault();
    if (loading || secondsLeft > 0) return;

    const normalized = normalizeSecondFactor(code);
    if (normalized.length < 6) {
      setFieldError('Introduce el código de 6 dígitos o un código de recuperación.');
      codeRef.current?.focus();
      return;
    }
    setFieldError('');
    clearError();

    const result = await submit(normalized);
    if (result.ok) {
      onSuccess(result.data);
      return;
    }
    if (result.error.code === 'INVALID_TWO_FACTOR_TOKEN') {
      onExpired();
      return;
    }
    if (result.error.code === 'INVALID_TWO_FACTOR_CODE') {
      setCode('');
      codeRef.current?.focus();
    }
  };

  return (
    <section className="mx-auto max-w-md">
      <h1
        ref={heading}
        tabIndex={-1}
        className="text-2xl font-bold outline-none"
      >
        Verificación en dos pasos
      </h1>
      <p className="mt-2 text-slate-600">
        Abre tu app de autenticación e introduce el código de 6 dígitos. Si no
        tienes acceso a ella, usa uno de tus códigos de recuperación (cada uno
        solo sirve una vez).
      </p>
      <form
        onSubmit={onSubmit}
        noValidate
        className="mt-4 space-y-4 rounded-lg border bg-white p-6 shadow-sm"
      >
        <FormField
          label="Código"
          name="code"
          autoComplete="one-time-code"
          autoCapitalize="none"
          spellCheck={false}
          maxLength={40}
          required
          hint="Ejemplo: 123456 o abcd-efgh-jkmn"
          value={code}
          onChange={(event) => {
            setCode(event.target.value);
            setFieldError('');
          }}
          error={fieldError}
          ref={codeRef}
        />
        <FormError message={authErrorMessage(error)} />
        <button
          type="submit"
          disabled={loading || secondsLeft > 0}
          className="w-full rounded-md bg-emerald-700 px-4 py-2 font-medium text-white disabled:opacity-50"
        >
          {loading
            ? 'Verificando…'
            : secondsLeft > 0
              ? `Espera ${formatWait(secondsLeft)}`
              : 'Verificar'}
        </button>
      </form>
      <p className="mt-4 text-center text-sm text-slate-600">
        <button
          type="button"
          onClick={onBack}
          className="text-emerald-700 underline"
        >
          Volver e iniciar sesión con otra cuenta
        </button>
      </p>
    </section>
  );
}

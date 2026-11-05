import { useEffect, useRef, useState } from 'react';
import FormError from '@/shared/components/FormError.jsx';
import FormField from '@/shared/components/FormField.jsx';
import { useSubmit } from '@/shared/hooks/useSubmit.js';
import { authErrorMessage, formatWait } from '../errors.js';
import { normalizeSecondFactor } from '../validation.js';

export default function ReauthForm({
  title,
  description,
  submitLabel,
  loadingLabel,
  danger = false,
  action,
  onSuccess,
  onCancel,
}) {
  const { submit, loading, error, clearError, secondsLeft } = useSubmit(action);
  const [form, setForm] = useState({ password: '', code: '' });
  const [fieldErrors, setFieldErrors] = useState({});
  const refs = useRef({});
  const heading = useRef(null);

  useEffect(() => {
    heading.current?.focus();
  }, []);

  const set = (name) => (event) => {
    setForm((current) => ({ ...current, [name]: event.target.value }));
    setFieldErrors((current) => {
      const { [name]: _removed, ...rest } = current;
      return rest;
    });
  };

  const onSubmit = async (event) => {
    event.preventDefault();
    if (loading || secondsLeft > 0) return;

    const code = normalizeSecondFactor(form.code);
    const errors = {};
    if (!form.password) errors.password = 'Introduce tu contraseña.';
    if (code.length < 6) {
      errors.code =
        'Introduce el código de 6 dígitos o un código de recuperación.';
    }
    setFieldErrors(errors);
    const firstError = Object.keys(errors)[0];
    if (firstError) {
      refs.current[firstError]?.focus();
      return;
    }

    clearError();
    const result = await submit({ password: form.password, code });
    if (result.ok) {
      onSuccess(result.data);
      return;
    }
    if (result.error.code === 'INVALID_PASSWORD') {
      setFieldErrors({ password: 'La contraseña es incorrecta.' });
      refs.current.password?.focus();
    } else if (result.error.code === 'INVALID_TWO_FACTOR_CODE') {
      setFieldErrors({ code: 'Código incorrecto.' });
      setForm((current) => ({ ...current, code: '' }));
      refs.current.code?.focus();
    }
  };

  const fieldLevel =
    error?.code === 'INVALID_PASSWORD' ||
    error?.code === 'INVALID_TWO_FACTOR_CODE';

  return (
    <form
      onSubmit={onSubmit}
      noValidate
      className="space-y-4 rounded-lg border bg-white p-6 shadow-sm"
    >
      <h3
        ref={heading}
        tabIndex={-1}
        className="text-lg font-semibold outline-none"
      >
        {title}
      </h3>
      <p className="text-sm text-slate-600">{description}</p>
      <FormField
        label="Contraseña"
        type="password"
        name="password"
        autoComplete="current-password"
        required
        value={form.password}
        onChange={set('password')}
        error={fieldErrors.password}
        ref={(element) => {
          refs.current.password = element;
        }}
      />
      <FormField
        label="Código de verificación o de recuperación"
        name="code"
        autoComplete="one-time-code"
        autoCapitalize="none"
        spellCheck={false}
        maxLength={40}
        required
        hint="Si usas un código de recuperación, quedará gastado."
        value={form.code}
        onChange={set('code')}
        error={fieldErrors.code}
        ref={(element) => {
          refs.current.code = element;
        }}
      />
      <FormError message={fieldLevel ? '' : authErrorMessage(error)} />
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="submit"
          disabled={loading || secondsLeft > 0}
          className={`rounded-md px-4 py-2 font-medium text-white disabled:opacity-50 ${danger ? 'bg-red-700' : 'bg-emerald-700'}`}
        >
          {loading
            ? loadingLabel
            : secondsLeft > 0
              ? `Espera ${formatWait(secondsLeft)}`
              : submitLabel}
        </button>
        <button
          type="button"
          onClick={onCancel}
          disabled={loading}
          className="text-slate-700 underline"
        >
          Cancelar
        </button>
      </div>
    </form>
  );
}

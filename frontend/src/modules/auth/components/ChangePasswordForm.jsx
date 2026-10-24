import { useRef, useState } from 'react';
import FormError from '@/shared/components/FormError.jsx';
import FormField from '@/shared/components/FormField.jsx';
import { useSubmit } from '@/shared/hooks/useSubmit.js';
import { useAuth } from '../AuthContext.jsx';
import { changePassword } from '../api.js';
import { authErrorMessage, formatWait } from '../errors.js';
import { MIN_PASSWORD } from '../validation.js';

const EMPTY = { currentPassword: '', newPassword: '', confirm: '' };

export default function ChangePasswordForm() {
  const { applySession } = useAuth();
  const { submit, loading, error, clearError, secondsLeft } =
    useSubmit(changePassword);
  const [form, setForm] = useState(EMPTY);
  const [fieldErrors, setFieldErrors] = useState({});
  const [success, setSuccess] = useState(false);
  const refs = useRef({});

  const set = (name) => (event) => {
    setForm((current) => ({ ...current, [name]: event.target.value }));
    setFieldErrors((current) => {
      const { [name]: _removed, ...rest } = current;
      return rest;
    });
    clearError();
    setSuccess(false);
  };

  const onSubmit = async (event) => {
    event.preventDefault();
    if (loading || secondsLeft > 0) return;

    const errors = {};
    if (!form.currentPassword) {
      errors.currentPassword = 'Introduce tu contraseña actual.';
    }
    if (form.newPassword.length < MIN_PASSWORD) {
      errors.newPassword = `La contraseña debe tener al menos ${MIN_PASSWORD} caracteres.`;
    } else if (form.newPassword === form.currentPassword) {
      errors.newPassword = 'La nueva contraseña debe ser distinta de la actual.';
    }
    if (form.confirm !== form.newPassword) {
      errors.confirm = 'Las contraseñas no coinciden.';
    }
    setFieldErrors(errors);
    const firstError = Object.keys(errors)[0];
    if (firstError) {
      refs.current[firstError]?.focus();
      return;
    }

    clearError();
    setSuccess(false);
    const result = await submit({
      currentPassword: form.currentPassword,
      newPassword: form.newPassword,
    });
    if (result.ok) {
      applySession(result.data.token, result.data.user);
      setForm(EMPTY);
      setSuccess(true);
      return;
    }

    if (result.error.code === 'INVALID_PASSWORD') {
      setFieldErrors({
        currentPassword: 'La contraseña actual es incorrecta.',
      });
      refs.current.currentPassword?.focus();
    } else if (result.error.code === 'SAME_PASSWORD') {
      setFieldErrors({
        newPassword: 'La nueva contraseña debe ser distinta de la actual.',
      });
      refs.current.newPassword?.focus();
    }
  };

  const fieldLevel =
    error?.code === 'INVALID_PASSWORD' || error?.code === 'SAME_PASSWORD';

  return (
    <form
      onSubmit={onSubmit}
      noValidate
      className="space-y-4 rounded-lg border bg-white p-6 shadow-sm"
    >
      <h2 className="text-lg font-semibold">Cambiar contraseña</h2>
      <FormField
        label="Contraseña actual"
        type="password"
        name="currentPassword"
        autoComplete="current-password"
        required
        value={form.currentPassword}
        onChange={set('currentPassword')}
        error={fieldErrors.currentPassword}
        ref={(element) => {
          refs.current.currentPassword = element;
        }}
      />
      <FormField
        label="Nueva contraseña"
        type="password"
        name="newPassword"
        autoComplete="new-password"
        required
        hint={`Mínimo ${MIN_PASSWORD} caracteres.`}
        value={form.newPassword}
        onChange={set('newPassword')}
        error={fieldErrors.newPassword}
        ref={(element) => {
          refs.current.newPassword = element;
        }}
      />
      <FormField
        label="Repite la nueva contraseña"
        type="password"
        name="confirm"
        autoComplete="new-password"
        required
        value={form.confirm}
        onChange={set('confirm')}
        error={fieldErrors.confirm}
        ref={(element) => {
          refs.current.confirm = element;
        }}
      />
      <FormError message={fieldLevel ? '' : authErrorMessage(error)} />
      <div role="status">
        {success && (
          <p className="rounded-md border border-emerald-300 bg-emerald-50 px-3 py-2 text-sm text-emerald-900">
            Contraseña cambiada. Se han cerrado tus otras sesiones abiertas y te
            hemos enviado un aviso por correo.
          </p>
        )}
      </div>
      <button
        type="submit"
        disabled={loading || secondsLeft > 0}
        className="rounded-md bg-emerald-700 px-4 py-2 font-medium text-white disabled:opacity-50"
      >
        {loading
          ? 'Guardando…'
          : secondsLeft > 0
            ? `Espera ${formatWait(secondsLeft)}`
            : 'Cambiar contraseña'}
      </button>
    </form>
  );
}

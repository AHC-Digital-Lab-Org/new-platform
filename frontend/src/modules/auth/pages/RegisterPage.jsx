import { useEffect, useId, useRef, useState } from 'react';
import { Link, Navigate } from 'react-router';
import FormError from '@/shared/components/FormError.jsx';
import FormField from '@/shared/components/FormField.jsx';
import { useSubmit } from '@/shared/hooks/useSubmit.js';
import { useAuth } from '../AuthContext.jsx';
import { register } from '../api.js';
import { authErrorMessage, formatWait } from '../errors.js';

const EMAIL_RE = /^\S+@\S+\.\S+$/;

const INITIAL = {
  alias: '',
  email: '',
  password: '',
  confirm: '',
  nombre: '',
  ciudad: '',
  pais: '',
  terminos: false,
  privacidad: false,
  comunicaciones: false,
};

function validate(form) {
  const errors = {};
  const alias = form.alias.trim();
  if (alias.length < 3 || alias.length > 30) {
    errors.alias = 'El alias debe tener entre 3 y 30 caracteres.';
  }
  if (!EMAIL_RE.test(form.email.trim())) errors.email = 'Introduce un email válido.';
  if (form.password.length < 8) {
    errors.password = 'La contraseña debe tener al menos 8 caracteres.';
  }
  if (form.confirm !== form.password) errors.confirm = 'Las contraseñas no coinciden.';
  if (!form.terminos) errors.terminos = 'Debes aceptar los términos de uso.';
  if (!form.privacidad) {
    errors.privacidad = 'Debes aceptar la política de privacidad.';
  }
  return errors;
}

function Check({ label, error, ref, ...props }) {
  const id = useId();
  const errorId = `${id}-error`;

  return (
    <div>
      <label htmlFor={id} className="flex items-start gap-2 text-sm">
        <input
          id={id}
          ref={ref}
          type="checkbox"
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? errorId : undefined}
          className="mt-0.5 size-4 accent-emerald-700"
          {...props}
        />
        <span>{label}</span>
      </label>
      {error && (
        <p id={errorId} className="mt-1 text-sm text-red-700">
          {error}
        </p>
      )}
    </div>
  );
}

export default function RegisterPage() {
  const { isAuthenticated } = useAuth();
  const { submit, loading, error, clearError, secondsLeft } = useSubmit(register);
  const [form, setForm] = useState(INITIAL);
  const [fieldErrors, setFieldErrors] = useState({});
  const [doneEmail, setDoneEmail] = useState(null);
  const refs = useRef({});
  const doneHeading = useRef(null);

  useEffect(() => {
    if (doneEmail) doneHeading.current?.focus();
  }, [doneEmail]);

  if (isAuthenticated) return <Navigate to="/" replace />;

  const setField = (name) => (event) => {
    const value =
      event.target.type === 'checkbox' ? event.target.checked : event.target.value;
    setForm((current) => ({ ...current, [name]: value }));
    setFieldErrors((current) => {
      const { [name]: _removed, ...rest } = current;
      return rest;
    });
  };

  const onSubmit = async (event) => {
    event.preventDefault();
    if (loading || secondsLeft > 0) return;

    const errors = validate(form);
    setFieldErrors(errors);
    const firstError = Object.keys(errors)[0];
    if (firstError) {
      refs.current[firstError]?.focus();
      return;
    }

    const body = {
      alias: form.alias.trim(),
      email: form.email.trim(),
      password: form.password,
      consentimientos: {
        terminos: true,
        privacidad: true,
        comunicaciones: form.comunicaciones,
        fecha: new Date().toISOString(),
      },
    };
    for (const key of ['nombre', 'ciudad', 'pais']) {
      const value = form[key].trim();
      if (value) body[key] = value;
    }

    clearError();
    const result = await submit(body);
    if (result.ok) setDoneEmail(body.email);
  };

  if (doneEmail) {
    return (
      <section className="mx-auto max-w-lg rounded-lg border bg-white p-6 shadow-sm">
        <h1 ref={doneHeading} tabIndex={-1} className="text-2xl font-bold outline-none">
          Revisa tu correo
        </h1>
        <p role="status" className="mt-3 text-slate-600">
          Hemos creado tu cuenta y enviado un enlace de verificación a{' '}
          <strong>{doneEmail}</strong>. Tienes que verificar tu email antes de
          poder iniciar sesión.
        </p>
        <p className="mt-4 text-sm text-slate-600">
          ¿No te ha llegado?{' '}
          <Link
            to="/resend-verification"
            state={{ email: doneEmail }}
            className="text-emerald-700 underline"
          >
            Reenviar el correo
          </Link>
        </p>
        <Link to="/login" className="mt-4 inline-block text-emerald-700 underline">
          Ir a iniciar sesión
        </Link>
      </section>
    );
  }

  const text = (name, label, props = {}) => (
    <FormField
      label={label}
      name={name}
      value={form[name]}
      onChange={setField(name)}
      error={fieldErrors[name]}
      ref={(element) => {
        refs.current[name] = element;
      }}
      {...props}
    />
  );

  return (
    <section className="mx-auto max-w-lg">
      <h1 className="text-2xl font-bold">Crear cuenta</h1>
      <p className="mt-1 text-sm text-slate-500">
        Los campos marcados con * son obligatorios.
      </p>
      <form
        onSubmit={onSubmit}
        noValidate
        className="mt-4 space-y-4 rounded-lg border bg-white p-6 shadow-sm"
      >
        {text('alias', 'Alias', {
          required: true,
          autoComplete: 'username',
          hint: 'Entre 3 y 30 caracteres.',
        })}
        {text('email', 'Email', {
          required: true,
          type: 'email',
          autoComplete: 'email',
        })}
        {text('password', 'Contraseña', {
          required: true,
          type: 'password',
          autoComplete: 'new-password',
          hint: 'Mínimo 8 caracteres.',
        })}
        {text('confirm', 'Repite la contraseña', {
          required: true,
          type: 'password',
          autoComplete: 'new-password',
        })}
        {text('nombre', 'Nombre', { autoComplete: 'name' })}
        {text('ciudad', 'Ciudad', { autoComplete: 'address-level2' })}
        {text('pais', 'País', { autoComplete: 'country-name' })}

        <fieldset className="space-y-3">
          <legend className="text-sm font-medium">Consentimientos</legend>
          <Check
            label="Acepto los términos de uso *"
            checked={form.terminos}
            onChange={setField('terminos')}
            error={fieldErrors.terminos}
            ref={(element) => {
              refs.current.terminos = element;
            }}
          />
          <Check
            label="He leído y acepto la política de privacidad *"
            checked={form.privacidad}
            onChange={setField('privacidad')}
            error={fieldErrors.privacidad}
            ref={(element) => {
              refs.current.privacidad = element;
            }}
          />
          <Check
            label="Quiero recibir comunicaciones de la organización (opcional)"
            checked={form.comunicaciones}
            onChange={setField('comunicaciones')}
          />
        </fieldset>

        <FormError message={authErrorMessage(error)} />
        <button
          type="submit"
          disabled={loading || secondsLeft > 0}
          className="w-full rounded-md bg-emerald-700 px-4 py-2 font-medium text-white disabled:opacity-50"
        >
          {loading
            ? 'Creando cuenta…'
            : secondsLeft > 0
              ? `Espera ${formatWait(secondsLeft)}`
              : 'Crear cuenta'}
        </button>
      </form>
      <p className="mt-4 text-center text-sm text-slate-600">
        ¿Ya tienes cuenta?{' '}
        <Link to="/login" className="text-emerald-700 underline">
          Iniciar sesión
        </Link>
      </p>
    </section>
  );
}

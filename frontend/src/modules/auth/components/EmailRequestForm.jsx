import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router';
import FormError from '@/shared/components/FormError.jsx';
import FormField from '@/shared/components/FormField.jsx';
import { useSubmit } from '@/shared/hooks/useSubmit.js';
import { authErrorMessage, formatWait } from '../errors.js';
import { EMAIL_RE } from '../validation.js';

export default function EmailRequestForm({
  title,
  intro,
  submitLabel,
  loadingLabel,
  action,
  initialEmail = '',
}) {
  const { submit, loading, error, clearError, secondsLeft } = useSubmit(action);
  const [email, setEmail] = useState(initialEmail);
  const [fieldError, setFieldError] = useState('');
  const [message, setMessage] = useState(null);
  const emailRef = useRef(null);
  const doneHeading = useRef(null);

  useEffect(() => {
    if (message) doneHeading.current?.focus();
  }, [message]);

  const onSubmit = async (event) => {
    event.preventDefault();
    if (loading || secondsLeft > 0) return;

    if (!EMAIL_RE.test(email.trim())) {
      setFieldError('Introduce un email válido.');
      emailRef.current?.focus();
      return;
    }
    setFieldError('');
    clearError();
    const result = await submit(email.trim());
    if (result.ok) {
      setMessage(result.data?.message ?? 'Solicitud enviada. Revisa tu correo.');
    }
  };

  if (message) {
    return (
      <section className="mx-auto max-w-md rounded-lg border bg-white p-6 shadow-sm">
        <h1
          ref={doneHeading}
          tabIndex={-1}
          className="text-2xl font-bold outline-none"
        >
          Revisa tu correo
        </h1>
        <p role="status" className="mt-3 text-slate-600">
          {message}
        </p>
        <Link to="/login" className="mt-4 inline-block text-emerald-700 underline">
          Volver a iniciar sesión
        </Link>
      </section>
    );
  }

  return (
    <section className="mx-auto max-w-md">
      <h1 className="text-2xl font-bold">{title}</h1>
      <p className="mt-2 text-slate-600">{intro}</p>
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
          value={email}
          onChange={(event) => {
            setEmail(event.target.value);
            setFieldError('');
          }}
          error={fieldError}
          ref={emailRef}
        />
        <FormError message={authErrorMessage(error)} />
        <button
          type="submit"
          disabled={loading || secondsLeft > 0}
          className="w-full rounded-md bg-emerald-700 px-4 py-2 font-medium text-white disabled:opacity-50"
        >
          {loading
            ? loadingLabel
            : secondsLeft > 0
              ? `Espera ${formatWait(secondsLeft)}`
              : submitLabel}
        </button>
      </form>
      <p className="mt-4 text-center text-sm text-slate-600">
        <Link to="/login" className="text-emerald-700 underline">
          Volver a iniciar sesión
        </Link>
      </p>
    </section>
  );
}

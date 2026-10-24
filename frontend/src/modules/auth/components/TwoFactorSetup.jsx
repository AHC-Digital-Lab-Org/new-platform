import { useEffect, useRef, useState } from 'react';
import FormError from '@/shared/components/FormError.jsx';
import FormField from '@/shared/components/FormField.jsx';
import { useSubmit } from '@/shared/hooks/useSubmit.js';
import { twoFactorEnable } from '../api.js';
import { authErrorMessage, formatWait } from '../errors.js';
import { normalizeSecondFactor } from '../validation.js';

const groupSecret = (secret) => secret.match(/.{1,4}/g)?.join(' ') ?? secret;

export default function TwoFactorSetup({ setup, onEnabled, onCancel }) {
  const { submit, loading, error, clearError, secondsLeft } =
    useSubmit(twoFactorEnable);
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
    if (!/^\d{6}$/.test(normalized)) {
      setFieldError('Introduce el código de 6 dígitos que muestra tu app.');
      codeRef.current?.focus();
      return;
    }
    setFieldError('');
    clearError();

    const result = await submit(normalized);
    if (result.ok) {
      onEnabled(result.data);
      return;
    }
    if (result.error.code === 'INVALID_TWO_FACTOR_CODE') {
      setCode('');
      codeRef.current?.focus();
    }
  };

  const message =
    error?.code === 'INVALID_TWO_FACTOR_CODE'
      ? 'Código incorrecto. Comprueba que has añadido esta cuenta en tu app y escribe el código actual.'
      : authErrorMessage(error);

  return (
    <div className="space-y-4 rounded-lg border bg-white p-6 shadow-sm">
      <h3
        ref={heading}
        tabIndex={-1}
        className="text-lg font-semibold outline-none"
      >
        Activar la verificación en dos pasos
      </h3>
      <ol className="list-decimal space-y-1 pl-5 text-sm text-slate-700">
        <li>
          Instala una app de autenticación (por ejemplo Aegis, Google
          Authenticator o Microsoft Authenticator).
        </li>
        <li>Escanea este código QR con la app, o introduce la clave a mano.</li>
        <li>Escribe aquí el código de 6 dígitos que te muestre.</li>
      </ol>
      <img
        src={setup.qrCode}
        alt="Código QR para configurar tu app de autenticación"
        className="size-48 rounded-md border"
      />
      <p className="text-sm text-slate-700">
        ¿No puedes escanearlo? Clave manual:{' '}
        <code className="select-all break-all font-mono font-semibold">
          {groupSecret(setup.secret)}
        </code>
      </p>
      <form onSubmit={onSubmit} noValidate className="space-y-4">
        <FormField
          label="Código de 6 dígitos"
          name="code"
          inputMode="numeric"
          autoComplete="one-time-code"
          required
          maxLength={7}
          value={code}
          onChange={(event) => {
            setCode(event.target.value);
            setFieldError('');
          }}
          error={fieldError}
          ref={codeRef}
        />
        <FormError message={message} />
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="submit"
            disabled={loading || secondsLeft > 0}
            className="rounded-md bg-emerald-700 px-4 py-2 font-medium text-white disabled:opacity-50"
          >
            {loading
              ? 'Activando…'
              : secondsLeft > 0
                ? `Espera ${formatWait(secondsLeft)}`
                : 'Activar'}
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
    </div>
  );
}

import { useRef, useState } from 'react';
import FormError from '@/shared/components/FormError.jsx';
import { useSubmit } from '@/shared/hooks/useSubmit.js';
import { useAuth } from '../AuthContext.jsx';
import {
  me,
  regenerateRecoveryCodes,
  twoFactorDisable,
  twoFactorSetup,
} from '../api.js';
import { authErrorMessage, formatWait } from '../errors.js';
import ReauthForm from './ReauthForm.jsx';
import RecoveryCodes from './RecoveryCodes.jsx';
import TwoFactorSetup from './TwoFactorSetup.jsx';

export default function TwoFactorSection() {
  const { user, updateUser } = useAuth();
  const [view, setView] = useState({ name: 'idle' });
  const [notice, setNotice] = useState('');
  const start = useSubmit(twoFactorSetup);
  const heading = useRef(null);

  const backToIdle = (message = '') => {
    setNotice(message);
    setView({ name: 'idle' });
    setTimeout(() => heading.current?.focus(), 0);
  };

  const refreshUser = async () => {
    try {
      const data = await me();
      updateUser(data.user);
    } catch (error) {
      setNotice(authErrorMessage(error));
    }
  };

  const startSetup = async () => {
    setNotice('');
    const result = await start.submit();
    if (result.ok) {
      setView({ name: 'setup', setup: result.data });
    } else if (result.error.code === 'TWO_FACTOR_ALREADY_ENABLED') {
      await refreshUser();
    }
  };

  if (view.name === 'codes') {
    const enabled = view.kind === 'enabled';
    return (
      <section>
        <RecoveryCodes
          codes={view.codes}
          title={
            enabled
              ? 'Verificación activada: guarda tus códigos de recuperación'
              : 'Códigos de recuperación nuevos'
          }
          onDone={() =>
            backToIdle(
              enabled
                ? 'Verificación en dos pasos activada.'
                : 'Códigos de recuperación nuevos guardados. Los anteriores ya no funcionan.',
            )
          }
        />
      </section>
    );
  }

  if (view.name === 'setup') {
    return (
      <section>
        <TwoFactorSetup
          setup={view.setup}
          onCancel={() => backToIdle()}
          onEnabled={({ user: updated, recoveryCodes }) => {
            updateUser(updated);
            setView({ name: 'codes', codes: recoveryCodes, kind: 'enabled' });
          }}
        />
      </section>
    );
  }

  if (view.name === 'disable') {
    return (
      <section>
        <ReauthForm
          title="Desactivar la verificación en dos pasos"
          description="Tu cuenta quedará protegida solo por la contraseña y se borrarán tus códigos de recuperación."
          submitLabel="Desactivar"
          loadingLabel="Desactivando…"
          danger
          action={twoFactorDisable}
          onCancel={() => backToIdle()}
          onSuccess={({ user: updated }) => {
            updateUser(updated);
            backToIdle('Verificación en dos pasos desactivada.');
          }}
        />
      </section>
    );
  }

  if (view.name === 'regenerate') {
    return (
      <section>
        <ReauthForm
          title="Generar códigos de recuperación nuevos"
          description="Los códigos que tengas ahora dejarán de funcionar."
          submitLabel="Generar códigos"
          loadingLabel="Generando…"
          action={regenerateRecoveryCodes}
          onCancel={() => backToIdle()}
          onSuccess={({ recoveryCodes }) =>
            setView({ name: 'codes', codes: recoveryCodes, kind: 'regenerated' })
          }
        />
      </section>
    );
  }

  return (
    <section className="space-y-3 rounded-lg border bg-white p-6 shadow-sm">
      <h2
        ref={heading}
        tabIndex={-1}
        className="text-lg font-semibold outline-none"
      >
        Verificación en dos pasos
      </h2>
      <div role="status">
        {notice && (
          <p className="rounded-md border border-emerald-300 bg-emerald-50 px-3 py-2 text-sm text-emerald-900">
            {notice}
          </p>
        )}
      </div>
      {user.twoFactorOn ? (
        <>
          <p className="text-sm text-slate-600">
            Estado: <strong>activada</strong>. Al iniciar sesión te pediremos un
            código de tu app de autenticación.
          </p>
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => {
                setNotice('');
                setView({ name: 'regenerate' });
              }}
              className="rounded-md border border-slate-400 px-4 py-2 font-medium"
            >
              Generar códigos de recuperación nuevos
            </button>
            <button
              type="button"
              onClick={() => {
                setNotice('');
                setView({ name: 'disable' });
              }}
              className="rounded-md border border-red-700 px-4 py-2 font-medium text-red-700 hover:bg-red-50"
            >
              Desactivar verificación en dos pasos
            </button>
          </div>
        </>
      ) : (
        <>
          <p className="text-sm text-slate-600">
            Estado: <strong>desactivada</strong>. Añade una capa extra de
            seguridad: además de la contraseña, se pedirá un código que genera
            tu móvil.
          </p>
          <FormError message={authErrorMessage(start.error)} />
          <button
            type="button"
            onClick={startSetup}
            disabled={start.loading || start.secondsLeft > 0}
            className="rounded-md bg-emerald-700 px-4 py-2 font-medium text-white disabled:opacity-50"
          >
            {start.loading
              ? 'Preparando…'
              : start.secondsLeft > 0
                ? `Espera ${formatWait(start.secondsLeft)}`
                : 'Activar verificación en dos pasos'}
          </button>
        </>
      )}
    </section>
  );
}

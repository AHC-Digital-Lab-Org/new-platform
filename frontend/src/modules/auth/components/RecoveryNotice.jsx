import { useEffect, useRef } from 'react';
import { Link } from 'react-router';

export default function RecoveryNotice({ remaining, to }) {
  const heading = useRef(null);

  useEffect(() => {
    heading.current?.focus();
  }, []);

  const message =
    remaining === 0
      ? 'Has usado tu último código de recuperación. Genera códigos nuevos cuanto antes: si pierdes el acceso a tu app de autenticación, no podrás entrar.'
      : `Te quedan ${remaining} ${
          remaining === 1 ? 'código' : 'códigos'
        } de recuperación sin usar.`;

  return (
    <section className="mx-auto max-w-md rounded-lg border border-amber-300 bg-amber-50 p-6 shadow-sm">
      <h1
        ref={heading}
        tabIndex={-1}
        className="text-2xl font-bold text-amber-950 outline-none"
      >
        Has entrado con un código de recuperación
      </h1>
      <p role="status" className="mt-3 text-amber-900">
        {message}
      </p>
      <p className="mt-2 text-sm text-amber-900">
        Cada código solo sirve una vez. Puedes generar códigos nuevos desde la
        sección de seguridad de tu cuenta.
      </p>
      <div className="mt-4 flex flex-wrap items-center gap-4">
        <Link
          to={to}
          replace
          className="rounded-md bg-emerald-700 px-4 py-2 font-medium text-white"
        >
          Continuar
        </Link>
        <Link
          to="/security"
          replace
          className="text-emerald-700 underline"
        >
          Ir a seguridad para generar códigos nuevos
        </Link>
      </div>
    </section>
  );
}

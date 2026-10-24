import { useEffect, useRef, useState } from 'react';

const fileText = (codes) =>
  [
    'Códigos de recuperación',
    `Generados el ${new Date().toLocaleDateString('es-ES')}`,
    '',
    'Cada código solo sirve una vez. Guárdalos en un lugar seguro y no los compartas.',
    '',
    ...codes,
    '',
  ].join('\n');

export default function RecoveryCodes({ codes, title, onDone }) {
  const heading = useRef(null);
  const [saved, setSaved] = useState(false);
  const [feedback, setFeedback] = useState('');

  useEffect(() => {
    heading.current?.focus();
  }, []);

  useEffect(() => {
    const warn = (event) => {
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, []);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(codes.join('\n'));
      setFeedback('Códigos copiados al portapapeles.');
    } catch {
      setFeedback(
        'No se pudo copiar automáticamente. Selecciona los códigos y cópialos a mano.',
      );
    }
  };

  const download = () => {
    const url = URL.createObjectURL(
      new Blob([fileText(codes)], { type: 'text/plain;charset=utf-8' }),
    );
    const link = document.createElement('a');
    link.href = url;
    link.download = 'codigos-recuperacion.txt';
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 0);
    setFeedback('Archivo descargado.');
  };

  return (
    <div className="space-y-4 rounded-lg border border-amber-300 bg-amber-50 p-6 shadow-sm">
      <h2
        ref={heading}
        tabIndex={-1}
        className="text-lg font-semibold text-amber-950 outline-none"
      >
        {title}
      </h2>
      <p className="text-sm text-amber-900">
        <strong>Esta es la única vez que se muestran.</strong> Cada código sirve
        una sola vez y te permite entrar si pierdes el acceso a tu app de
        autenticación. En un equipo compartido, mejor apúntalos en papel y no
        dejes el archivo en la carpeta de descargas.
      </p>
      <ol className="grid gap-2 sm:grid-cols-2">
        {codes.map((code) => (
          <li
            key={code}
            className="rounded-md border border-amber-200 bg-white px-3 py-2"
          >
            <code className="select-all font-mono text-base">{code}</code>
          </li>
        ))}
      </ol>
      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          onClick={copy}
          className="rounded-md border border-slate-400 bg-white px-4 py-2 text-sm font-medium"
        >
          Copiar códigos
        </button>
        <button
          type="button"
          onClick={download}
          className="rounded-md border border-slate-400 bg-white px-4 py-2 text-sm font-medium"
        >
          Descargar (.txt)
        </button>
      </div>
      <div role="status" className="text-sm text-amber-900">
        {feedback}
      </div>
      <label className="flex items-start gap-2 text-sm">
        <input
          type="checkbox"
          checked={saved}
          onChange={(event) => setSaved(event.target.checked)}
          className="mt-0.5 size-4 accent-emerald-700"
        />
        <span>He guardado mis códigos de recuperación en un lugar seguro</span>
      </label>
      <button
        type="button"
        onClick={onDone}
        disabled={!saved}
        className="rounded-md bg-emerald-700 px-4 py-2 font-medium text-white disabled:opacity-50"
      >
        Terminar
      </button>
    </div>
  );
}

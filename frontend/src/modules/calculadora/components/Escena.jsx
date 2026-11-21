// Ilustraciones propias del módulo: un mismo paisaje (cielo, sol y colinas) con el protagonista de
// cada paso. Formas planas con los colores del módulo para que funcionen en cualquier tamaño.

const Paisaje = ({ children, sol = { x: 640, y: 70 } }) => (
  <>
    <rect width="800" height="240" fill="var(--c-cielo)" />
    <circle cx={sol.x} cy={sol.y} r="34" fill="var(--c-sol)" />
    <circle cx={sol.x} cy={sol.y} r="52" fill="var(--c-sol)" opacity="0.18" />
    <path d="M0 150 C120 112 220 128 330 146 S560 118 800 132 V240 H0Z" fill="var(--c-brote)" />
    {children}
    <path d="M0 190 C140 166 300 176 430 190 S660 172 800 182 V240 H0Z" fill="var(--c-hoja)" />
    <path d="M0 214 C180 204 360 222 520 212 S720 206 800 214 V240 H0Z" fill="var(--c-bosque)" />
  </>
);

const Arbol = ({ x, y, escala = 1 }) => (
  <g transform={`translate(${x} ${y}) scale(${escala})`}>
    <rect x="-3" y="0" width="6" height="22" rx="2" fill="var(--c-tierra)" />
    <circle cx="0" cy="-6" r="16" fill="var(--c-bosque)" />
    <circle cx="-8" cy="2" r="11" fill="var(--c-hoja)" />
  </g>
);

const Nube = ({ x, y, escala = 1 }) => (
  <g transform={`translate(${x} ${y}) scale(${escala})`} fill="var(--c-superficie)">
    <ellipse cx="0" cy="0" rx="34" ry="12" />
    <ellipse cx="14" cy="-9" rx="18" ry="13" />
    <ellipse cx="-12" cy="-6" rx="14" ry="10" />
  </g>
);

const ESCENAS = {
  bienvenida: (
    <Paisaje sol={{ x: 600, y: 84 }}>
      <Nube x={170} y={64} />
      <Nube x={430} y={40} escala={0.7} />
      <path d="M380 240 C395 200 420 170 470 150 S560 128 600 132" fill="none" stroke="var(--c-superficie)" strokeWidth="14" strokeLinecap="round" strokeDasharray="2 22" />
      <Arbol x={150} y={150} escala={1.2} />
      <Arbol x={190} y={160} />
      <Arbol x={700} y={150} escala={1.1} />
    </Paisaje>
  ),
  vivienda: (
    <Paisaje>
      <Nube x={140} y={58} />
      <g transform="translate(330 86)">
        <rect x="0" y="50" width="150" height="78" fill="var(--c-superficie)" />
        <path d="M-14 56 L75 0 L164 56Z" fill="var(--c-tierra)" />
        <rect x="112" y="6" width="16" height="30" fill="var(--c-tierra)" />
        <path d="M120 2 c-6 -12 8 -16 2 -30" fill="none" stroke="var(--c-superficie)" strokeWidth="5" strokeLinecap="round" opacity="0.8" />
        <rect x="20" y="70" width="32" height="26" rx="3" fill="var(--c-sol)" />
        <rect x="98" y="70" width="32" height="26" rx="3" fill="var(--c-sol)" />
        <rect x="60" y="86" width="30" height="42" rx="3" fill="var(--c-bosque)" />
        <path d="M22 44 l40 -25 M74 36 l40 -25" stroke="var(--c-agua)" strokeWidth="9" strokeLinecap="round" opacity="0.85" />
      </g>
      <Arbol x={250} y={164} escala={1.3} />
      <Arbol x={560} y={160} escala={1.1} />
    </Paisaje>
  ),
  transporte: (
    <Paisaje sol={{ x: 120, y: 72 }}>
      <Nube x={520} y={52} />
      <path d="M0 196 C200 170 420 178 800 168" fill="none" stroke="var(--c-tinta-suave)" strokeWidth="26" opacity="0.55" />
      <path d="M0 196 C200 170 420 178 800 168" fill="none" stroke="var(--c-superficie)" strokeWidth="2.5" strokeDasharray="16 14" />
      <g transform="translate(250 136)">
        <rect x="0" y="12" width="96" height="30" rx="10" fill="var(--c-tierra)" />
        <path d="M18 12 L32 -6 H66 L82 12Z" fill="var(--c-tierra)" />
        <path d="M34 -1 H64 L74 11 H26Z" fill="var(--c-cielo)" />
        <circle cx="22" cy="42" r="10" fill="var(--c-tinta)" />
        <circle cx="76" cy="42" r="10" fill="var(--c-tinta)" />
      </g>
      <g transform="translate(470 108)">
        <rect x="0" y="0" width="170" height="60" rx="12" fill="var(--c-agua)" />
        {[14, 52, 90, 128].map((x) => <rect key={x} x={x} y="12" width="28" height="20" rx="3" fill="var(--c-cielo)" />)}
        <circle cx="34" cy="60" r="11" fill="var(--c-tinta)" />
        <circle cx="136" cy="60" r="11" fill="var(--c-tinta)" />
      </g>
      <Arbol x={700} y={140} escala={1.2} />
    </Paisaje>
  ),
  vuelos: (
    <Paisaje sol={{ x: 660, y: 92 }}>
      <Nube x={180} y={110} />
      <Nube x={560} y={56} escala={0.8} />
      <path d="M90 170 C220 60 420 40 560 70" fill="none" stroke="var(--c-superficie)" strokeWidth="4" strokeDasharray="10 12" strokeLinecap="round" />
      <g transform="translate(560 70) rotate(12)">
        <path d="M-40 0 C-40 -8 30 -10 52 -4 C62 -1 62 5 52 7 C30 12 -40 9 -40 0Z" fill="var(--c-superficie)" />
        <path d="M0 -2 L-18 -34 H-6 L22 -2Z" fill="var(--c-agua)" />
        <path d="M0 6 L-14 30 H-3 L20 6Z" fill="var(--c-agua)" />
        <path d="M-40 0 L-52 -18 H-42 L-28 -2Z" fill="var(--c-agua)" />
      </g>
      <Arbol x={120} y={158} />
      <Arbol x={300} y={170} escala={0.9} />
    </Paisaje>
  ),
  productos: (
    <Paisaje sol={{ x: 140, y: 80 }}>
      <Nube x={600} y={60} />
      <g transform="translate(330 86)">
        <path d="M20 40 H140 L128 128 H32Z" fill="var(--c-tierra)" />
        <path d="M44 40 C44 6 116 6 116 40" fill="none" stroke="var(--c-tierra)" strokeWidth="8" />
        <circle cx="60" cy="34" r="18" fill="var(--c-alerta)" opacity="0.85" />
        <path d="M86 40 C80 10 104 0 118 6 C114 22 104 36 86 40Z" fill="var(--c-hoja)" />
        <path d="M100 38 C108 18 132 16 138 24 C128 34 116 40 100 38Z" fill="var(--c-bosque)" />
        <rect x="44" y="60" width="72" height="8" rx="4" fill="var(--c-arcilla)" />
        <rect x="52" y="80" width="56" height="8" rx="4" fill="var(--c-arcilla)" />
      </g>
      <Arbol x={600} y={156} escala={1.2} />
      <Arbol x={650} y={166} />
    </Paisaje>
  ),
};

export default function Escena({ paso, className = '', anclarAbajo = false }) {
  return (
    <svg
      viewBox={anclarAbajo ? '120 0 560 240' : '0 0 800 240'}
      preserveAspectRatio={anclarAbajo ? 'xMidYMax slice' : 'xMidYMid slice'}
      role="presentation"
      className={`block h-full w-full ${className}`}
    >
      {ESCENAS[paso]}
    </svg>
  );
}

const TRAZOS = {
  bienvenida: <path d="M12 3c-3 4-7 6-7 11a7 7 0 0014 0c0-5-4-7-7-11zM12 21v-8m0 3l-3-3m3 1l3-3" />,
  vivienda: <path d="M3 11l9-7 9 7M5 9.5V20h14V9.5M10 20v-6h4v6" />,
  transporte: <path d="M5 16h14M6 16l1.5-5h9L18 16M7 19.5a1.5 1.5 0 100-3 1.5 1.5 0 000 3zm10 0a1.5 1.5 0 100-3 1.5 1.5 0 000 3zM4 16h1v2H4zm15 0h1v2h-1z" />,
  vuelos: <path d="M3 14l7-2 4-7h2l-2 7 6-1.5 1 1.5-7 3-6 2-3-.5zM8 19h12" />,
  productos: <path d="M5 8h14l-1.5 11h-11zM9 8a3 3 0 016 0" />,
  resultados: <path d="M12 21a9 9 0 100-18 9 9 0 000 18zM3.5 10h5l2 3-1.5 3M14 3.5l-1 3.5 3 2 4-.5M15 20l-.5-4 3-2" />,
};

export function IconoPaso({ paso, className = 'size-5' }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={className} fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      {TRAZOS[paso]}
    </svg>
  );
}

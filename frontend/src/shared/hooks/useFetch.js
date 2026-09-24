import { useEffect, useState } from 'react';

// Hook mínimo de carga de datos. Si la app crece, se sustituye por TanStack Query.
export function useFetch(fn, deps) {
  const [state, setState] = useState({ data: null, error: null, loading: true });

  useEffect(() => {
    let cancelled = false;
    setState((s) => ({ ...s, loading: true }));
    fn()
      .then((data) => !cancelled && setState({ data, error: null, loading: false }))
      .catch((error) => !cancelled && setState({ data: null, error, loading: false }));
    return () => {
      cancelled = true;
    };
  }, deps);

  return state;
}

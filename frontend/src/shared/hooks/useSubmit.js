import { useCallback, useEffect, useRef, useState } from 'react';

export function useSubmit(action) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [secondsLeft, setSecondsLeft] = useState(0);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  useEffect(() => {
    if (secondsLeft <= 0) return undefined;
    const timeout = setTimeout(() => setSecondsLeft((seconds) => seconds - 1), 1000);
    return () => clearTimeout(timeout);
  }, [secondsLeft]);

  const submit = useCallback(
    async (...args) => {
      setLoading(true);
      setError(null);
      try {
        const data = await action(...args);
        return { ok: true, data };
      } catch (submissionError) {
        if (mounted.current) {
          setError(submissionError);
          if (
            submissionError.code === 'TOO_MANY_REQUESTS' &&
            submissionError.retryAfter > 0
          ) {
            setSecondsLeft(submissionError.retryAfter);
          }
        }
        return { ok: false, error: submissionError };
      } finally {
        if (mounted.current) setLoading(false);
      }
    },
    [action],
  );

  const clearError = useCallback(() => setError(null), []);

  return { submit, loading, error, clearError, secondsLeft };
}

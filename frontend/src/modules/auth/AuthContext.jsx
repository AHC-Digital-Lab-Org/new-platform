import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useNavigate } from 'react-router';
import {
  SESSION_ERROR_CODES,
  setAuthToken,
  setSessionInvalidHandler,
} from '@/shared/api/client.js';
import * as authApi from './api.js';
import { clearToken, getToken, saveToken } from './tokenStorage.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const navigate = useNavigate();
  const [state, setState] = useState({
    status: 'loading',
    user: null,
    error: null,
  });
  const [attempt, setAttempt] = useState(0);
  const statusRef = useRef(state.status);

  useEffect(() => {
    statusRef.current = state.status;
  }, [state.status]);

  const endSession = useCallback(() => {
    clearToken();
    setAuthToken(null);
    statusRef.current = 'anonymous';
    setState({ status: 'anonymous', user: null, error: null });
  }, []);

  const applySession = useCallback((token, user) => {
    saveToken(token);
    setAuthToken(token);
    statusRef.current = 'authenticated';
    setState({ status: 'authenticated', user, error: null });
  }, []);

  const updateUser = useCallback((user) => {
    setState((current) =>
      current.status === 'authenticated' ? { ...current, user } : current,
    );
  }, []);

  useEffect(() => {
    setSessionInvalidHandler(() => {
      const wasAuthenticated = statusRef.current === 'authenticated';
      endSession();
      if (wasAuthenticated) {
        navigate('/login', {
          replace: true,
          state: { sessionExpired: true },
        });
      }
    });
    return () => setSessionInvalidHandler(null);
  }, [endSession, navigate]);

  useEffect(() => {
    const token = getToken();
    if (!token) {
      setAuthToken(null);
      statusRef.current = 'anonymous';
      setState({ status: 'anonymous', user: null, error: null });
      return undefined;
    }

    let cancelled = false;
    setAuthToken(token);

    authApi
      .me()
      .then(({ user }) => {
        if (!cancelled) {
          statusRef.current = 'authenticated';
          setState({ status: 'authenticated', user, error: null });
        }
      })
      .catch((error) => {
        if (cancelled) return;
        if (SESSION_ERROR_CODES.has(error.code)) {
          endSession();
        } else {
          statusRef.current = 'error';
          setState({ status: 'error', user: null, error });
        }
      });

    return () => {
      cancelled = true;
    };
  }, [attempt, endSession]);

  const login = useCallback(
    async (email, password) => {
      const result = await authApi.login({ email, password });
      if (result.twoFactorRequired) {
        return {
          twoFactorRequired: true,
          twoFactorToken: result.twoFactorToken,
        };
      }
      applySession(result.token, result.user);
      return { twoFactorRequired: false };
    },
    [applySession],
  );

  const retry = useCallback(() => {
    setState((current) => ({ ...current, status: 'loading', error: null }));
    setAttempt((current) => current + 1);
  }, []);

  const value = useMemo(
    () => ({
      status: state.status,
      user: state.user,
      error: state.error,
      isAuthenticated: state.status === 'authenticated',
      login,
      logout: endSession,
      applySession,
      updateUser,
      retry,
    }),
    [state, login, endSession, applySession, updateUser, retry],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth debe usarse dentro de <AuthProvider>');
  return context;
}

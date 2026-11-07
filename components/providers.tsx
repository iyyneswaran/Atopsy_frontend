'use client';
import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { QueryClient, QueryClientProvider, useQueryClient } from '@tanstack/react-query';
import { api, ApiError, token } from '@/lib/api/client';
import type { User } from '@/types/api';
import { CheckCircle2, X, AlertCircle } from 'lucide-react';

interface AuthState {
  user: User | null;
  loading: boolean;
  error: Error | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  reload: () => Promise<void>;
  endSession: () => void;
}
const AuthContext = createContext<AuthState | null>(null);
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('AuthProvider missing');
  return context;
};
function AuthProvider({ children }: { children: ReactNode }) {
  const cache = useQueryClient();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const endSession = useCallback(() => {
    setUser(null);
    cache.clear();
  }, [cache]);
  const reload = useCallback(async () => {
    try {
      const result = await api<User>('/auth/me');
      setUser(result.data);
      setError(null);
    } catch (e) {
      if (!(e instanceof ApiError && [401, 403].includes(e.status))) setError(e as Error);
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    let cancelled = false;
    void api<User>('/auth/me')
      .then((result) => {
        if (!cancelled) {
          setUser(result.data);
          setError(null);
        }
      })
      .catch((e) => {
        if (!cancelled) {
          if (!(e instanceof ApiError && [401, 403].includes(e.status))) setError(e as Error);
          setUser(null);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    const expired = () => endSession();
    const storage = (event: StorageEvent) => {
      if (event.key === 'atopsy.accessToken' && !event.newValue) endSession();
    };
    window.addEventListener('atopsy:expired', expired);
    window.addEventListener('storage', storage);
    return () => {
      cancelled = true;
      window.removeEventListener('atopsy:expired', expired);
      window.removeEventListener('storage', storage);
    };
  }, [endSession]);
  const login = async (email: string, password: string) => {
    const result = await api<{ user: User; accessToken: string }>(
      '/auth/login',
      { method: 'POST', body: JSON.stringify({ email, password }) },
      false,
    );
    cache.clear();
    token.set(result.data.accessToken);
    setUser(result.data.user);
    setError(null);
  };
  const logout = async () => {
    await api('/auth/logout', { method: 'POST' });
    token.clear();
    endSession();
  };
  return (
    <AuthContext.Provider value={{ user, loading, error, login, logout, reload, endSession }}>
      {children}
    </AuthContext.Provider>
  );
}
const ToastContext = createContext<(text: string, error?: boolean) => void>(() => {});
export const useToast = () => useContext(ToastContext);
function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<{ id: number; text: string; error: boolean }[]>([]);
  const notify = useCallback((text: string, error = false) => {
    const id = Date.now() + Math.random();
    setItems((current) => [...current.slice(-3), { id, text, error }]);
    setTimeout(() => setItems((current) => current.filter((item) => item.id !== id)), 6000);
  }, []);
  return (
    <ToastContext.Provider value={notify}>
      {children}
      <div className="toast-stack" aria-live="polite">
        {items.map((item) => (
          <div className={`toast ${item.error ? 'toast-error' : ''}`} key={item.id}>
            {item.error ? <AlertCircle size={18} /> : <CheckCircle2 size={18} />}
            <span>{item.text}</span>
            <button
              className="icon-button"
              aria-label="Dismiss notification"
              onClick={() => setItems((current) => current.filter((i) => i.id !== item.id))}
            >
              <X size={15} />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
export function Providers({ children }: { children: ReactNode }) {
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 15000,
            refetchOnWindowFocus: true,
            retry: (count, error) =>
              !(error instanceof ApiError && error.status < 500) && count < 1,
          },
          mutations: { retry: false },
        },
      }),
  );
  return (
    <QueryClientProvider client={client}>
      <AuthProvider>
        <ToastProvider>{children}</ToastProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

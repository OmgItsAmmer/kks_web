import { useQueryClient } from '@tanstack/react-query';
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { api, setUnauthorizedHandler } from './api-client';
import { roleCan, type AdminRole, type Permission } from './permissions';

export interface Me {
  email: string;
  name: string;
  role: AdminRole;
}

interface AuthState {
  me: Me | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  can: (permission: Permission) => boolean;
}

const AuthContext = createContext<AuthState | null>(null);

/** Sign out after this long without any mouse, key or touch activity (plan 5.1). */
const IDLE_LIMIT_MS = 30 * 60 * 1000;

export function AuthProvider({ children }: { children: ReactNode }) {
  const [me, setMe] = useState<Me | null>(null);
  const [loading, setLoading] = useState(true);
  const queryClient = useQueryClient();
  const lastActivity = useRef(Date.now());

  const clear = useCallback(() => {
    setMe(null);
    queryClient.clear();
  }, [queryClient]);

  useEffect(() => {
    setUnauthorizedHandler(clear);
    api
      .get<Me>('/auth/me')
      .then(setMe)
      .catch(() => setMe(null))
      .finally(() => setLoading(false));
  }, [clear]);

  // Idle timeout
  useEffect(() => {
    if (!me) return;
    const touch = () => {
      lastActivity.current = Date.now();
    };
    const events = ['mousemove', 'keydown', 'click', 'touchstart', 'scroll'] as const;
    events.forEach((e) => window.addEventListener(e, touch, { passive: true }));
    const timer = setInterval(() => {
      if (Date.now() - lastActivity.current > IDLE_LIMIT_MS) {
        void api.post('/auth/logout').catch(() => undefined);
        clear();
      }
    }, 30_000);
    return () => {
      events.forEach((e) => window.removeEventListener(e, touch));
      clearInterval(timer);
    };
  }, [me, clear]);

  const value = useMemo<AuthState>(
    () => ({
      me,
      loading,
      signIn: async (email, password) => {
        const user = await api.post<Me>('/auth/login', { email, password });
        lastActivity.current = Date.now();
        setMe(user);
      },
      signOut: async () => {
        await api.post('/auth/logout').catch(() => undefined);
        clear();
      },
      can: (permission) => roleCan(me?.role, permission),
    }),
    [me, loading, clear],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}

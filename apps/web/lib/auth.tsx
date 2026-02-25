'use client';

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from 'react';
import { auth as authApi, type AuthVerifyResponse } from './api';

interface User {
  id: string;
  email: string;
  plan: 'free' | 'pro';
  createdAt: string;
}

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  error: string | null;
  login: (email: string) => Promise<{ success: boolean; message: string }>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const response = await authApi.me();
      // API returns { data: { user, workspace } }
      const userData = response.data?.user || response.user;
      if (userData) {
        setUser({
          id: userData.id,
          email: userData.email,
          plan: (response.data?.workspace?.plan_type as 'free' | 'pro') || 'free',
          createdAt: userData.created_at || userData.createdAt,
        });
      } else {
        setUser(null);
      }
      setError(null);
    } catch (err) {
      setUser(null);
      // 401 is expected when not logged in
      if (err instanceof Error && 'status' in err && (err as { status: number }).status !== 401) {
        setError('Failed to fetch user');
      }
    }
  }, []);

  useEffect(() => {
    refresh().finally(() => setLoading(false));
  }, [refresh]);

  const login = async (email: string) => {
    try {
      const response = await authApi.requestMagicLink(email);
      return { success: true, message: response.message };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to send magic link';
      return { success: false, message };
    }
  };

  const logout = async () => {
    try {
      await authApi.logout();
      setUser(null);
    } catch {
      // Still clear user on client even if API fails
      setUser(null);
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, error, login, logout, refresh }}>
      {children}
    </AuthContext.Provider>
  );
}

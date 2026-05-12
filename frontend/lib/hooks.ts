/**
 * useAuth Hook
 * Provides authentication state and utilities
 */

'use client';

import { useContext, createContext, useEffect, useState, useCallback } from 'react';
import { apiClient } from './api';
import {
  getAccessToken,
  isAuthenticated,
  clearTokens,
  getUserId,
} from './auth';
import type { UserResponse } from '../types';

interface AuthContextType {
  user: UserResponse | null;
  isLoading: boolean;
  error: string | null;
  isAuthenticated: boolean;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

/**
 * AuthProvider - Wraps your app to provide auth state
 */
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchUser = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Check if token exists
      if (!getAccessToken() || !isAuthenticated()) {
        setUser(null);
        return;
      }

      // Fetch current user
      const response = await apiClient.get<UserResponse>('/api/v1/auth/me');
      setUser(response);
    } catch (err) {
      console.error('Failed to fetch user:', err);
      setUser(null);
      if (typeof err === 'object' && err !== null && 'status' in err) {
        const status = (err as any).status;
        if (status === 401) {
          clearTokens();
        }
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Check auth on mount
  useEffect(() => {
    fetchUser();
  }, [fetchUser]);

  const logout = useCallback(() => {
    clearTokens();
    setUser(null);
    // Optionally redirect to login
    if (typeof window !== 'undefined') {
      window.location.href = '/auth/login';
    }
  }, []);

  const value: AuthContextType = {
    user,
    isLoading,
    error,
    isAuthenticated: !!user,
    logout,
    refreshUser: fetchUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

/**
 * useAuth Hook
 * Use this in any component to access auth state
 *
 * @example
 * const { user, isAuthenticated, logout } = useAuth();
 */
export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}

/**
 * useAuthRedirect Hook
 * Redirects to login if not authenticated
 *
 * @param redirectTo - Page to redirect to after login
 * @example
 * useAuthRedirect();
 */
export function useAuthRedirect(redirectTo?: string): void {
  const { isAuthenticated, isLoading } = useAuth();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      if (typeof window !== 'undefined') {
        const query = redirectTo ? `?redirect=${encodeURIComponent(redirectTo)}` : '';
        window.location.href = `/auth/login${query}`;
      }
    }
  }, [isAuthenticated, isLoading, redirectTo]);
}

/**
 * useIsAuth Hook
 * Simple hook that returns just the authentication status
 */
export function useIsAuth(): boolean {
  const { isAuthenticated, isLoading } = useAuth();
  return !isLoading && isAuthenticated;
}

/**
 * useUser Hook
 * Returns current user or null
 */
export function useUser(): UserResponse | null {
  const { user, isLoading } = useAuth();
  return isLoading ? null : user;
}

/**
 * useLogout Hook
 * Returns logout function
 */
export function useLogout(): () => void {
  const { logout } = useAuth();
  return logout;
}

"use client";

import { useEffect, useRef } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import * as authApi from "@/lib/api/auth";
import { ApiClientError } from "@/lib/api/types";
import type { LoginRequest, RegisterRequest, User } from "@/lib/api/types";
import { useAuthStore } from "@/store/authStore";

interface UseAuthResult {
  user: User | null;
  isLoading: boolean;
  error: ApiClientError | null;
  login: (data: LoginRequest) => Promise<void>;
  logout: () => Promise<void>;
  register: (data: RegisterRequest) => Promise<void>;
  refresh: () => Promise<void>;
}

export function useAuth(): UseAuthResult {
  const queryClient = useQueryClient();
  const { user, setUser, setTokens, clearAuth, accessToken } = useAuthStore();
  const refreshTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Query for current user profile
  const meQuery = useQuery({
    queryKey: ["auth", "me"],
    queryFn: authApi.getCurrentUser,
    enabled: Boolean(accessToken),
    retry: false,
  });

  if (meQuery.data && meQuery.data !== user) {
    setUser(meQuery.data);
  }

  // Login mutation
  const loginMutation = useMutation({
    mutationFn: authApi.login,
    onSuccess: (payload) => {
      setTokens({
        accessToken: payload.access_token,
        refreshToken: payload.refresh_token,
      });
      setUser(payload.user);
      queryClient.setQueryData(["auth", "me"], payload.user);
      // Schedule automatic token refresh before expiry
      scheduleTokenRefresh(payload.expires_in);
    },
  });

  // Register mutation
  const registerMutation = useMutation({
    mutationFn: authApi.register,
    onSuccess: (payload) => {
      setTokens({
        accessToken: payload.access_token,
        refreshToken: payload.refresh_token,
      });
      setUser(payload.user);
      queryClient.setQueryData(["auth", "me"], payload.user);
      // Schedule automatic token refresh before expiry
      scheduleTokenRefresh(payload.expires_in);
    },
  });

  // Logout mutation
  const logoutMutation = useMutation({
    mutationFn: authApi.logout,
    onSettled: async () => {
      clearAuth();
      // Clear refresh timer on logout
      if (refreshTimerRef.current) {
        clearTimeout(refreshTimerRef.current);
        refreshTimerRef.current = null;
      }
      await queryClient.invalidateQueries({ queryKey: ["auth"] });
    },
  });

  // Refresh mutation
  const refreshMutation = useMutation({
    mutationFn: () =>
      authApi.refreshToken({
        refresh_token: useAuthStore.getState().refreshToken || "",
      }),
    onSuccess: (payload) => {
      setTokens({
        accessToken: payload.access_token,
        refreshToken: payload.refresh_token,
      });
      queryClient.setQueryData(["auth", "me"], user);
      // Reschedule token refresh
      scheduleTokenRefresh(payload.expires_in);
    },
    onError: () => {
      // If refresh fails, clear auth and log out
      clearAuth();
      if (refreshTimerRef.current) {
        clearTimeout(refreshTimerRef.current);
        refreshTimerRef.current = null;
      }
    },
  });

  /**
   * Schedule automatic token refresh before expiry.
   * Refreshes at 80% of token lifetime to ensure freshness.
   */
  const scheduleTokenRefresh = (expiresInSeconds: number) => {
    // Clear any existing timer
    if (refreshTimerRef.current) {
      clearTimeout(refreshTimerRef.current);
    }

    // Schedule refresh at 80% of token lifetime (e.g., 12 minutes for a 15-minute token)
    const refreshDelayMs = Math.floor(expiresInSeconds * 0.8 * 1000);

    refreshTimerRef.current = setTimeout(() => {
      refreshMutation.mutate();
    }, refreshDelayMs);
  };

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (refreshTimerRef.current) {
        clearTimeout(refreshTimerRef.current);
      }
    };
  }, []);

  // Schedule refresh when token changes
  useEffect(() => {
    if (accessToken) {
      // Default to 15 minutes if we don't know the actual expiry
      // The actual expiry is tracked by the server and tokens are in HTTP-only cookies
      scheduleTokenRefresh(15 * 60);
    }
  }, [accessToken]);

  return {
    user,
    isLoading:
      meQuery.isLoading ||
      loginMutation.isPending ||
      registerMutation.isPending ||
      logoutMutation.isPending ||
      refreshMutation.isPending,
    error:
      (loginMutation.error as ApiClientError | null) ||
      (registerMutation.error as ApiClientError | null) ||
      (logoutMutation.error as ApiClientError | null) ||
      (refreshMutation.error as ApiClientError | null) ||
      (meQuery.error as ApiClientError | null),
    login: async (data) => {
      await loginMutation.mutateAsync(data);
    },
    logout: async () => {
      await logoutMutation.mutateAsync();
    },
    register: async (data) => {
      await registerMutation.mutateAsync(data);
    },
    refresh: async () => {
      await refreshMutation.mutateAsync();
    },
  };
}

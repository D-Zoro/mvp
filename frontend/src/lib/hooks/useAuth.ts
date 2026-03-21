"use client";

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

  const meQuery = useQuery({
    queryKey: ["auth", "me"],
    queryFn: authApi.getCurrentUser,
    enabled: Boolean(accessToken),
    retry: false,
  });

  if (meQuery.data && meQuery.data !== user) {
    setUser(meQuery.data);
  }

  const loginMutation = useMutation({
    mutationFn: authApi.login,
    onSuccess: (payload) => {
      setTokens({
        accessToken: payload.access_token,
        refreshToken: payload.refresh_token,
      });
      setUser(payload.user);
      queryClient.setQueryData(["auth", "me"], payload.user);
    },
  });

  const registerMutation = useMutation({
    mutationFn: authApi.register,
    onSuccess: (payload) => {
      setTokens({
        accessToken: payload.access_token,
        refreshToken: payload.refresh_token,
      });
      setUser(payload.user);
      queryClient.setQueryData(["auth", "me"], payload.user);
    },
  });

  const logoutMutation = useMutation({
    mutationFn: authApi.logout,
    onSettled: async () => {
      clearAuth();
      await queryClient.invalidateQueries({ queryKey: ["auth"] });
    },
  });

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
      setUser(payload.user);
      queryClient.setQueryData(["auth", "me"], payload.user);
    },
  });

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

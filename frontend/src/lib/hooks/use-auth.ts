"use client";

import { useMutation, useQuery, type UseQueryOptions } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";
import { API } from "@/lib/api/endpoints";
import { queryKeys } from "@/lib/query/keys";
import type { ForgotPasswordInput, LoginInput, RegisterInput, ResetPasswordInput, User, VerifyEmailInput } from "@/types/auth";

export function useMe(options?: Omit<UseQueryOptions<User, Error>, "queryKey" | "queryFn">) {
  return useQuery({
    queryKey: queryKeys.auth.me(),
    queryFn: async () => (await apiClient.get<User>(API.auth.me)).data,
    ...options,
  });
}

export const useLogin = () => useMutation({ mutationFn: async (input: LoginInput) => (await apiClient.post<{ user: User }>(API.auth.login, input)).data });
export const useRegister = () => useMutation({ mutationFn: async (input: RegisterInput) => (await apiClient.post<{ user: User }>(API.auth.register, input)).data });
export const useLogout = () => useMutation({ mutationFn: async () => (await apiClient.post(API.auth.logout)).data });
export const useForgotPassword = () => useMutation({ mutationFn: async (input: ForgotPasswordInput) => (await apiClient.post(API.auth.forgotPassword, input)).data });
export const useResetPassword = () => useMutation({ mutationFn: async (input: ResetPasswordInput) => (await apiClient.post(API.auth.resetPassword, input)).data });
export const useVerifyEmail = () => useMutation({ mutationFn: async (input: VerifyEmailInput) => (await apiClient.post(API.auth.verifyEmail, input)).data });

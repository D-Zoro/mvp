import { apiRequest } from "@/lib/api/client";
import {
  AuthResponse,
  LoginRequest,
  RefreshTokenRequest,
  RegisterRequest,
  User,
} from "@/lib/api/types";

export const register = (data: RegisterRequest): Promise<AuthResponse> =>
  apiRequest<AuthResponse, RegisterRequest>({
    url: "/auth/register",
    method: "POST",
    data,
  });

export const login = (data: LoginRequest): Promise<AuthResponse> =>
  apiRequest<AuthResponse, LoginRequest>({
    url: "/auth/login",
    method: "POST",
    data,
  });

export const logout = (): Promise<{ message?: string }> =>
  apiRequest<{ message?: string }>({
    url: "/auth/logout",
    method: "POST",
  });

export const refreshToken = (
  data: RefreshTokenRequest
): Promise<AuthResponse> =>
  apiRequest<AuthResponse, RefreshTokenRequest>({
    url: "/auth/refresh",
    method: "POST",
    data,
  });

export const getCurrentUser = (): Promise<User> =>
  apiRequest<User>({
    url: "/auth/me",
    method: "GET",
  });

import axios, { AxiosError, AxiosInstance, AxiosRequestConfig } from "axios";

import {
  clearAuthTokens,
  getAccessToken,
  getRefreshToken,
  setAuthTokens,
} from "@/lib/auth/tokenStorage";
import { ApiClientError, ApiErrorBody } from "@/lib/api/types";

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
const API_PREFIX = "/api/v1";

const client: AxiosInstance = axios.create({
  baseURL: `${BASE_URL}${API_PREFIX}`,
  timeout: 15000,
  headers: {
    "Content-Type": "application/json",
  },
});

let refreshPromise: Promise<string | null> | null = null;

const refreshAccessToken = async (): Promise<string | null> => {
  const refreshToken = getRefreshToken();
  if (!refreshToken) return null;

  const response = await axios.post<{ access_token: string; refresh_token: string }>(
    `${BASE_URL}${API_PREFIX}/auth/refresh`,
    { refresh_token: refreshToken },
    { headers: { "Content-Type": "application/json" } }
  );

  const nextAccess = response.data.access_token;
  const nextRefresh = response.data.refresh_token || refreshToken;

  setAuthTokens({ accessToken: nextAccess, refreshToken: nextRefresh });

  return nextAccess;
};

client.interceptors.request.use((config) => {
  const token = getAccessToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

client.interceptors.response.use(
  (response) => response,
  async (error: AxiosError<ApiErrorBody>) => {
    const status = error.response?.status;
    const originalRequest = error.config as AxiosRequestConfig & {
      _retry?: boolean;
    };

    const isAuthEndpoint =
      originalRequest?.url?.includes("/auth/login") ||
      originalRequest?.url?.includes("/auth/register") ||
      originalRequest?.url?.includes("/auth/refresh");

    if (status === 401 && !originalRequest?._retry && !isAuthEndpoint) {
      originalRequest._retry = true;

      try {
        if (!refreshPromise) {
          refreshPromise = refreshAccessToken().finally(() => {
            refreshPromise = null;
          });
        }

        const newAccessToken = await refreshPromise;
        if (!newAccessToken) {
          clearAuthTokens();
          return Promise.reject(toApiClientError(error));
        }

        originalRequest.headers = {
          ...originalRequest.headers,
          Authorization: `Bearer ${newAccessToken}`,
        };

        return client(originalRequest);
      } catch {
        clearAuthTokens();
        return Promise.reject(toApiClientError(error));
      }
    }

    return Promise.reject(toApiClientError(error));
  }
);

export const toApiClientError = (error: unknown): ApiClientError => {
  if (axios.isAxiosError<ApiErrorBody>(error)) {
    const status = error.response?.status ?? 500;
    const body = error.response?.data;

    const detail = body?.detail;
    const message =
      typeof detail === "string"
        ? detail
        : Array.isArray(detail)
          ? detail.map((d) => d.message || d.field || "Validation error").join(", ")
          : error.message || "Request failed";

    return new ApiClientError(message, status, body);
  }

  if (error instanceof Error) {
    return new ApiClientError(error.message, 500);
  }

  return new ApiClientError("Unknown error", 500);
};

export async function apiRequest<TResponse, TBody = unknown>(
  config: AxiosRequestConfig<TBody>
): Promise<TResponse> {
  const response = await client.request<TResponse, { data: TResponse }, TBody>(config);
  return response.data;
}

export { client as apiClient };

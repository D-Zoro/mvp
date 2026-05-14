import axios, { AxiosError, type InternalAxiosRequestConfig } from "axios";
import { API } from "./endpoints";

type RetryConfig = InternalAxiosRequestConfig & { _retry?: boolean };

function shouldSkipRefresh(config: RetryConfig) {
  const headers = config.headers as Record<string, unknown> | undefined;
  return headers?.["x-skip-refresh"] === "true" || headers?.["X-Skip-Refresh"] === "true" || config.url === API.auth.refresh;
}

export const apiClient = axios.create({
  baseURL: "",
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
  },
});

apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const original = error.config as RetryConfig | undefined;
    if (error.response?.status === 401 && original && !original._retry && !shouldSkipRefresh(original)) {
      original._retry = true;
      try {
        await apiClient.post(API.auth.refresh);
        return apiClient(original);
      } catch (refreshError) {
        if (typeof window !== "undefined") window.location.assign("/login");
        return Promise.reject(refreshError);
      }
    }
    return Promise.reject(error);
  },
);

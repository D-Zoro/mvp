import axios, { AxiosError, type InternalAxiosRequestConfig } from "axios";
import { API } from "./endpoints";

type RetryConfig = InternalAxiosRequestConfig & { _retry?: boolean };

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
    if (error.response?.status === 401 && original && !original._retry && original.url !== API.auth.refresh) {
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

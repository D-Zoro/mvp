/**
 * Type-safe HTTP API Client
 * Features:
 * - Automatic Bearer token attachment
 * - Automatic token refresh on 401
 * - Typed request/response
 * - Error handling with details
 */

import {
  getAccessToken,
  getRefreshToken,
  setTokens,
  clearTokens,
  isTokenExpired,
} from "./auth";
import type { TokenResponse, ApiError } from "../types";

const API_BASE_URL =
  typeof window !== "undefined"
    ? process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"
    : "http://localhost:8000";

class ApiClient {
  private baseUrl: string;
  private refreshPromise: Promise<string> | null = null;

  constructor(baseUrl: string = API_BASE_URL) {
    this.baseUrl = baseUrl;
  }

  /**
   * Make a GET request
   */
  async get<T>(endpoint: string, options?: RequestInit): Promise<T> {
    return this.request<T>(endpoint, {
      ...options,
      method: "GET",
    });
  }

  /**
   * Make a POST request
   */
  async post<T>(endpoint: string, body?: unknown, options?: RequestInit): Promise<T> {
    return this.request<T>(endpoint, {
      ...options,
      method: "POST",
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  /**
   * Make a PUT request
   */
  async put<T>(endpoint: string, body?: unknown, options?: RequestInit): Promise<T> {
    return this.request<T>(endpoint, {
      ...options,
      method: "PUT",
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  /**
   * Make a DELETE request
   */
  async delete<T>(endpoint: string, options?: RequestInit): Promise<T> {
    return this.request<T>(endpoint, {
      ...options,
      method: "DELETE",
    });
  }

  /**
   * Upload a file (multipart/form-data)
   */
  async upload<T>(endpoint: string, file: File, options?: RequestInit): Promise<T> {
    const formData = new FormData();
    formData.append("file", file);

    return this.request<T>(endpoint, {
      ...options,
      method: "POST",
      body: formData,
      headers: {
        // Don't set Content-Type for FormData, browser will set it with boundary
        ...(options?.headers || {}),
      },
    });
  }

  /**
   * Core request method with token refresh logic
   */
  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = this.buildUrl(endpoint);
    const headers = this.buildHeaders(options.headers);

    let response = await fetch(url, {
      ...options,
      headers,
    });

    // Handle token refresh on 401
    if (response.status === 401 && !endpoint.includes("/refresh")) {
      const newAccessToken = await this.refreshAccessToken();
      if (newAccessToken) {
        // Retry the original request with new token
        headers.Authorization = `Bearer ${newAccessToken}`;
        response = await fetch(url, {
          ...options,
          headers,
        });
      }
    }

    return this.handleResponse<T>(response);
  }

  /**
   * Refresh access token using refresh token
   */
  private async refreshAccessToken(): Promise<string | null> {
    // Prevent multiple simultaneous refresh attempts
    if (this.refreshPromise) {
      return this.refreshPromise;
    }

    const refreshToken = getRefreshToken();
    if (!refreshToken) {
      clearTokens();
      return null;
    }

    this.refreshPromise = (async () => {
      try {
        const response = await fetch(this.buildUrl("/api/v1/auth/refresh"), {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ refresh_token: refreshToken }),
        });

        if (!response.ok) {
          clearTokens();
          return null;
        }

        const data = (await response.json()) as TokenResponse;
        setTokens(data.access_token, data.refresh_token);
        return data.access_token;
      } catch (error) {
        console.error("Token refresh failed:", error);
        clearTokens();
        return null;
      } finally {
        this.refreshPromise = null;
      }
    })();

    return this.refreshPromise;
  }

  /**
   * Build full URL from endpoint
   */
  private buildUrl(endpoint: string): string {
    if (endpoint.startsWith("http")) {
      return endpoint;
    }
    return `${this.baseUrl}${endpoint}`;
  }

  /**
   * Build request headers with authorization
   */
  private buildHeaders(customHeaders?: HeadersInit): Record<string, string> {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };

    // Add custom headers
    if (customHeaders) {
      if (customHeaders instanceof Headers) {
        customHeaders.forEach((value, key) => {
          headers[key] = value;
        });
      } else if (Array.isArray(customHeaders)) {
        customHeaders.forEach(([key, value]) => {
          headers[key] = value;
        });
      } else {
        Object.assign(headers, customHeaders);
      }
    }

    // Add authorization token
    const token = getAccessToken();
    if (token && !isTokenExpired(token)) {
      headers.Authorization = `Bearer ${token}`;
    }

    return headers;
  }

  /**
   * Handle response and throw typed errors
   */
  private async handleResponse<T>(response: Response): Promise<T> {
    const contentType = response.headers.get("content-type");
    let data: unknown;

    if (contentType?.includes("application/json")) {
      data = await response.json();
    } else {
      data = await response.text();
    }

    if (!response.ok) {
      const error: ApiError = {
        status: response.status,
        message: this.getErrorMessage(response.status, data),
        detail: data,
      };
      throw error;
    }

    return data as T;
  }

  /**
   * Get user-friendly error message
   */
  private getErrorMessage(status: number, data: unknown): string {
    if (typeof data === "object" && data !== null) {
      if ("detail" in data && typeof data.detail === "string") {
        return data.detail;
      }
      if ("message" in data && typeof data.message === "string") {
        return data.message;
      }
    }

    const messages: Record<number, string> = {
      400: "Invalid request",
      401: "Unauthorized - please log in",
      403: "Forbidden",
      404: "Not found",
      409: "Conflict - resource already exists",
      422: "Validation error",
      429: "Too many requests - please try again later",
      500: "Server error",
      503: "Service unavailable",
    };

    return messages[status] || `Error: ${status}`;
  }
}

// Export singleton instance
export const apiClient = new ApiClient();

// Export for testing purposes
export { ApiClient };

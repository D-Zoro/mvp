/**
 * Axios HTTP Client for Browser/Client-side
 * Handles authentication, error handling, and API communication
 */

import axios, { AxiosError, AxiosInstance, AxiosResponse } from 'axios';
import { useRouter } from 'next/navigation';
import type { APIErrorResponse } from '@/types/api';

// ============================================================================
// ERROR HANDLING
// ============================================================================

/**
 * Typed API error class for consistent error handling
 */
export class APIError extends Error {
  public readonly status: number;
  public readonly data?: Record<string, any>;

  constructor(message: string, status: number, data?: Record<string, any>) {
    super(message);
    this.name = 'APIError';
    this.status = status;
    this.data = data;
  }
}

// ============================================================================
// COOKIE UTILITIES
// ============================================================================

/**
 * Get a cookie value by name from document.cookies
 */
export function getCookie(name: string): string | null {
  if (typeof document === 'undefined') {
    return null; // Server-side: cannot access document.cookies
  }

  const nameEQ = `${name}=`;
  const cookies = document.cookie.split(';');

  for (const cookie of cookies) {
    const trimmed = cookie.trim();
    if (trimmed.startsWith(nameEQ)) {
      return decodeURIComponent(trimmed.substring(nameEQ.length));
    }
  }

  return null;
}

/**
 * Set a cookie value
 */
export function setCookie(name: string, value: string, options?: { maxAge?: number; path?: string }) {
  if (typeof document === 'undefined') {
    return; // Server-side: cannot set cookies from here
  }

  let cookieString = `${encodeURIComponent(name)}=${encodeURIComponent(value)}`;

  if (options?.maxAge) {
    cookieString += `; Max-Age=${options.maxAge}`;
  }

  if (options?.path) {
    cookieString += `; Path=${options.path}`;
  }

  document.cookie = cookieString;
}

/**
 * Delete a cookie
 */
export function deleteCookie(name: string) {
  setCookie(name, '', { maxAge: 0, path: '/' });
}

// ============================================================================
// API CLIENT CONFIGURATION
// ============================================================================

/**
 * Create and configure the Axios API client instance
 */
function createAPIClient(): AxiosInstance {
  const baseURL = process.env.NEXT_PUBLIC_API_BASE_URL || '/api';

  const client = axios.create({
    baseURL,
    withCredentials: true,
    headers: {
      'Content-Type': 'application/json',
    },
  });

  // ========================================================================
  // REQUEST INTERCEPTOR: Inject Authorization Header
  // ========================================================================
  client.interceptors.request.use(
    (config) => {
      const token = getCookie('access_token');

      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }

      return config;
    },
    (error) => {
      // Log request error for debugging
      console.error('[API Request Error]', error);
      return Promise.reject(error);
    }
  );

  // ========================================================================
  // RESPONSE INTERCEPTOR: Handle Errors & Token Refresh
  // ========================================================================
  client.interceptors.response.use(
    (response) => response,
    async (error: AxiosError<APIErrorResponse | Record<string, any>>) => {
      const status = error.response?.status;
      const data = error.response?.data;

      // Handle 401 Unauthorized: Redirect to login
      if (status === 401) {
        // Clear auth tokens
        deleteCookie('access_token');
        deleteCookie('refresh_token');

        // Redirect to login page (requires router access)
        if (typeof window !== 'undefined') {
          // Use window.location for immediate redirect (works in any context)
          window.location.href = '/login';
        }

        // Return a generic unauthorized error
        const apiError = new APIError('Unauthorized. Please log in.', 401, data);
        return Promise.reject(apiError);
      }

      // Handle 403 Forbidden
      if (status === 403) {
        const message = (data as any)?.message || 'You do not have permission to perform this action.';
        const apiError = new APIError(message, 403, data);
        return Promise.reject(apiError);
      }

      // Handle 404 Not Found
      if (status === 404) {
        const message = (data as any)?.message || 'Resource not found.';
        const apiError = new APIError(message, 404, data);
        return Promise.reject(apiError);
      }

      // Handle 422 Validation Error
      if (status === 422) {
        const message = (data as any)?.message || 'Validation failed. Please check your input.';
        const apiError = new APIError(message, 422, data);
        return Promise.reject(apiError);
      }

      // Handle 5xx Server Errors
      if (status && status >= 500) {
        const message = (data as any)?.message || 'Server error. Please try again later.';
        const apiError = new APIError(message, status, data);
        return Promise.reject(apiError);
      }

      // Handle other errors
      const message = (data as any)?.message || error.message || 'An unexpected error occurred.';
      const apiError = new APIError(message, status || 0, data);

      console.error('[API Response Error]', {
        status,
        message,
        data,
      });

      return Promise.reject(apiError);
    }
  );

  return client;
}

// ============================================================================
// EXPORTED API CLIENT INSTANCE
// ============================================================================

/**
 * Singleton API client instance for all HTTP requests
 * Automatically injects auth token and handles errors
 */
export const apiClient = createAPIClient();

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Check if user is authenticated (has access token)
 */
export function isAuthenticated(): boolean {
  const token = getCookie('access_token');
  return !!token;
}

/**
 * Get current access token from cookies
 */
export function getAccessToken(): string | null {
  return getCookie('access_token');
}

/**
 * Set authentication tokens (called after login/register)
 */
export function setAuthTokens(accessToken: string, refreshToken: string): void {
  // Set access token with 15-minute expiry (typical JWT expiry)
  setCookie('access_token', accessToken, {
    maxAge: 15 * 60, // 15 minutes
    path: '/',
  });

  // Set refresh token with 7-day expiry
  setCookie('refresh_token', refreshToken, {
    maxAge: 7 * 24 * 60 * 60, // 7 days
    path: '/',
  });
}

/**
 * Clear authentication tokens (called on logout)
 */
export function clearAuthTokens(): void {
  deleteCookie('access_token');
  deleteCookie('refresh_token');
}

// ============================================================================
// TYPE EXPORTS
// ============================================================================

/**
 * Type for API responses with generic data
 */
export type APIResponse<T> = AxiosResponse<T>;

export type { AxiosError };

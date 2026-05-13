/**
 * Server-side Fetch API Wrapper
 * For Next.js Server Components and server-side operations
 * Handles authentication and typed API communication
 */

import { cookies } from 'next/headers';
import type { APIErrorResponse } from '@/types/api';

// ============================================================================
// ERROR HANDLING
// ============================================================================

/**
 * Server-side API error class
 */
export class ServerAPIError extends Error {
  public readonly status: number;
  public readonly data?: Record<string, any>;

  constructor(message: string, status: number, data?: Record<string, any>) {
    super(message);
    this.name = 'ServerAPIError';
    this.status = status;
    this.data = data;
  }
}

// ============================================================================
// COOKIE UTILITIES
// ============================================================================

/**
 * Get access token from server-side cookies
 * This function must be called in a server-side context (Server Component or API route)
 */
export async function getAccessToken(): Promise<string | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('access_token')?.value;
    return token || null;
  } catch (error) {
    console.error('[ServerAPIError] Failed to read access token from cookies:', error);
    return null;
  }
}

/**
 * Get refresh token from server-side cookies
 */
export async function getRefreshToken(): Promise<string | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('refresh_token')?.value;
    return token || null;
  } catch (error) {
    console.error('[ServerAPIError] Failed to read refresh token from cookies:', error);
    return null;
  }
}

// ============================================================================
// SERVER-SIDE FETCH WRAPPER
// ============================================================================

/**
 * Configuration for server fetch requests
 */
export interface ServerFetchOptions extends RequestInit {
  headers?: Record<string, string>;
  timeout?: number;
}

/**
 * Type-safe server-side fetch wrapper with authentication
 * Automatically injects access token from cookies
 *
 * @template T - Expected response data type
 * @param url - API endpoint URL (relative to API base)
 * @param options - Fetch options (method, body, headers, etc.)
 * @returns Parsed JSON response of type T
 * @throws ServerAPIError on HTTP errors or network failure
 *
 * @example
 * ```typescript
 * // In a Server Component
 * const books = await serverFetch<BookListResponse>('/api/v1/books?page=1');
 * ```
 */
export async function serverFetch<T>(url: string, options: ServerFetchOptions = {}): Promise<T> {
  const baseURL = process.env.NEXT_PUBLIC_API_BASE_URL || process.env.API_BASE_URL || '/api';
  const fullURL = new URL(url, baseURL).toString();

  // Get access token from cookies
  const token = await getAccessToken();

  // Build headers
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  // Inject authorization header if token exists
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  // Set default timeout (30 seconds)
  const timeout = options.timeout || 30000;

  try {
    // Create abort controller for timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    const response = await fetch(fullURL, {
      ...options,
      headers,
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    // Handle HTTP errors
    if (!response.ok) {
      let errorData: Record<string, any> | undefined;

      try {
        errorData = await response.json();
      } catch {
        // If response is not JSON, leave errorData undefined
      }

      // Log warnings for 401 (cannot redirect in RSC context)
      if (response.status === 401) {
        console.warn('[ServerAPIError] Unauthorized access in Server Component. Token may be expired.');
        throw new ServerAPIError('Unauthorized. Please log in again.', 401, errorData);
      }

      // Handle other HTTP errors
      const message =
        (errorData as any)?.message || `HTTP error! status: ${response.status}`;
      throw new ServerAPIError(message, response.status, errorData);
    }

    // Parse and return response
    const data = (await response.json()) as T;
    return data;
  } catch (error) {
    // Handle fetch errors (network, timeout, etc.)
    if (error instanceof ServerAPIError) {
      throw error;
    }

    if (error instanceof TypeError) {
      // Network error or URL parsing error
      const message = error.message.includes('fetch')
        ? 'Network error. Please check your connection.'
        : error.message;
      throw new ServerAPIError(message, 0, { originalError: error.message });
    }

    if ((error as any)?.name === 'AbortError') {
      throw new ServerAPIError('Request timeout. Please try again.', 0);
    }

    // Unknown error
    const message = error instanceof Error ? error.message : 'An unexpected error occurred.';
    console.error('[ServerAPIError]', message, error);
    throw new ServerAPIError(message, 0, { originalError: String(error) });
  }
}

// ============================================================================
// CONVENIENCE METHODS
// ============================================================================

/**
 * GET request helper
 */
export async function serverGet<T>(url: string, options?: ServerFetchOptions): Promise<T> {
  return serverFetch<T>(url, { ...options, method: 'GET' });
}

/**
 * POST request helper
 */
export async function serverPost<T>(
  url: string,
  body?: Record<string, any>,
  options?: ServerFetchOptions
): Promise<T> {
  return serverFetch<T>(url, {
    ...options,
    method: 'POST',
    body: body ? JSON.stringify(body) : undefined,
  });
}

/**
 * PUT request helper
 */
export async function serverPut<T>(
  url: string,
  body?: Record<string, any>,
  options?: ServerFetchOptions
): Promise<T> {
  return serverFetch<T>(url, {
    ...options,
    method: 'PUT',
    body: body ? JSON.stringify(body) : undefined,
  });
}

/**
 * PATCH request helper
 */
export async function serverPatch<T>(
  url: string,
  body?: Record<string, any>,
  options?: ServerFetchOptions
): Promise<T> {
  return serverFetch<T>(url, {
    ...options,
    method: 'PATCH',
    body: body ? JSON.stringify(body) : undefined,
  });
}

/**
 * DELETE request helper
 */
export async function serverDelete<T>(url: string, options?: ServerFetchOptions): Promise<T> {
  return serverFetch<T>(url, { ...options, method: 'DELETE' });
}

// ============================================================================
// USAGE EXAMPLES
// ============================================================================

/**
 * @example Server Component Usage:
 *
 * ```typescript
 * // app/books/page.tsx (Server Component)
 * import { serverFetch, serverGet } from '@/lib/api/server-client';
 * import type { BookListResponse } from '@/types/api';
 *
 * export default async function BooksPage() {
 *   try {
 *     // Type-safe fetch with automatic auth
 *     const books = await serverFetch<BookListResponse>('/api/v1/books?page=1');
 *
 *     return (
 *       <div>
 *         {books.items.map((book) => (
 *           <div key={book.id}>{book.title}</div>
 *         ))}
 *       </div>
 *     );
 *   } catch (error) {
 *     if (error instanceof ServerAPIError) {
 *       if (error.status === 401) {
 *         redirect('/login');
 *       }
 *       return <div>Error: {error.message}</div>;
 *     }
 *     throw error;
 *   }
 * }
 * ```
 *
 * @example API Route Usage:
 *
 * ```typescript
 * // app/api/proxy/books/route.ts
 * import { serverGet } from '@/lib/api/server-client';
 * import type { BookListResponse } from '@/types/api';
 *
 * export async function GET(request: Request) {
 *   try {
 *     const books = await serverGet<BookListResponse>('/api/v1/books');
 *     return Response.json(books);
 *   } catch (error) {
 *     return Response.json(
 *       { error: error instanceof Error ? error.message : 'Unknown error' },
 *       { status: 500 }
 *     );
 *   }
 * }
 * ```
 */

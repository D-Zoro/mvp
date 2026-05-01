export const ACCESS_TOKEN_KEY = "books4all_access_token";
export const REFRESH_TOKEN_KEY = "books4all_refresh_token";

const isBrowser = (): boolean => typeof window !== "undefined";

/**
 * Get access token from cookies (preferred) or localStorage (deprecated fallback).
 * Logs a warning if token is found in localStorage.
 */
export const getAccessToken = (): string | null => {
  if (!isBrowser()) return null;

  // Try to get from cookies first (new approach)
  const cookieToken = getCookieToken("access_token");
  if (cookieToken) {
    return cookieToken;
  }

  // Fallback to localStorage (deprecated, but supported for backward compatibility)
  const storageToken = localStorage.getItem(ACCESS_TOKEN_KEY);
  if (storageToken) {
    console.warn(
      "[Auth] Access token found in localStorage. " +
      "This is deprecated. Tokens should be stored in HTTP-only cookies. " +
      "Please log in again to migrate to the new cookie-based system."
    );
  }
  return storageToken;
};

/**
 * Get refresh token from cookies (preferred) or localStorage (deprecated fallback).
 * Logs a warning if token is found in localStorage.
 */
export const getRefreshToken = (): string | null => {
  if (!isBrowser()) return null;

  // Try to get from cookies first (new approach)
  const cookieToken = getCookieToken("refresh_token");
  if (cookieToken) {
    return cookieToken;
  }

  // Fallback to localStorage (deprecated, but supported for backward compatibility)
  const storageToken = localStorage.getItem(REFRESH_TOKEN_KEY);
  if (storageToken) {
    console.warn(
      "[Auth] Refresh token found in localStorage. " +
      "This is deprecated. Tokens should be stored in HTTP-only cookies. " +
      "Please log in again to migrate to the new cookie-based system."
    );
  }
  return storageToken;
};

/**
 * Get token value from a cookie by name.
 * Tokens are now stored in HTTP-only cookies set by the backend.
 */
function getCookieToken(name: string): string | null {
  if (!isBrowser()) return null;
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) {
    return parts.pop()?.split(";").shift() ?? null;
  }
  return null;
}

/**
 * Set authentication tokens in both localStorage (deprecated) and rely on cookies.
 * The backend now sets HTTP-only cookies, so this mainly updates localStorage
 * for backward compatibility with existing code.
 * @deprecated Tokens are now stored in HTTP-only cookies by the backend.
 */
export const setAuthTokens = (tokens: {
  accessToken: string;
  refreshToken: string;
}): void => {
  if (!isBrowser()) return;
  // Store in localStorage for backward compatibility (deprecated)
  localStorage.setItem(ACCESS_TOKEN_KEY, tokens.accessToken);
  localStorage.setItem(REFRESH_TOKEN_KEY, tokens.refreshToken);
};

/**
 * Clear authentication tokens from localStorage.
 * Note: HTTP-only cookies are cleared by the backend's /logout endpoint.
 */
export const clearAuthTokens = (): void => {
  if (!isBrowser()) return;
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
};

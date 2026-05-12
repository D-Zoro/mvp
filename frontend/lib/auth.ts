/**
 * JWT Token Management
 * Handles access/refresh token storage, retrieval, and expiry checks
 */

const ACCESS_TOKEN_KEY = "books4all_access_token";
const REFRESH_TOKEN_KEY = "books4all_refresh_token";

/**
 * Get the current access token from localStorage
 */
export function getAccessToken(): string | null {
  try {
    return localStorage.getItem(ACCESS_TOKEN_KEY);
  } catch (e) {
    console.warn("Failed to read access token:", e);
    return null;
  }
}

/**
 * Get the current refresh token from localStorage
 */
export function getRefreshToken(): string | null {
  try {
    return localStorage.getItem(REFRESH_TOKEN_KEY);
  } catch (e) {
    console.warn("Failed to read refresh token:", e);
    return null;
  }
}

/**
 * Store both access and refresh tokens
 */
export function setTokens(accessToken: string, refreshToken: string): void {
  try {
    localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
    localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
  } catch (e) {
    console.error("Failed to store tokens:", e);
  }
}

/**
 * Clear both tokens
 */
export function clearTokens(): void {
  try {
    localStorage.removeItem(ACCESS_TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
  } catch (e) {
    console.warn("Failed to clear tokens:", e);
  }
}

/**
 * Check if a token exists and is not expired
 */
export function isAuthenticated(): boolean {
  const token = getAccessToken();
  if (!token) return false;

  try {
    const payload = parseJwt(token);
    if (!payload.exp) return false;

    const expiryTime = payload.exp * 1000; // Convert to milliseconds
    return Date.now() < expiryTime;
  } catch (e) {
    console.warn("Failed to validate token:", e);
    return false;
  }
}

/**
 * Decode a JWT and extract the payload (without verification)
 * Note: This only decodes, it doesn't verify the signature
 */
export function parseJwt(token: string): Record<string, any> {
  try {
    const base64Url = token.split(".")[1];
    const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split("")
        .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
        .join("")
    );
    return JSON.parse(jsonPayload);
  } catch (e) {
    console.error("Failed to parse JWT:", e);
    return {};
  }
}

/**
 * Extract user ID from access token
 */
export function getUserId(): string | null {
  const token = getAccessToken();
  if (!token) return null;

  try {
    const payload = parseJwt(token);
    return payload.sub || null;
  } catch (e) {
    console.warn("Failed to extract user ID:", e);
    return null;
  }
}

/**
 * Check if token is expired
 */
export function isTokenExpired(token: string): boolean {
  try {
    const payload = parseJwt(token);
    if (!payload.exp) return true;

    const expiryTime = payload.exp * 1000; // Convert to milliseconds
    return Date.now() >= expiryTime;
  } catch (e) {
    return true;
  }
}

/**
 * Check if token will expire soon (within 5 minutes)
 */
export function willTokenExpireSoon(token: string, buffer = 5 * 60 * 1000): boolean {
  try {
    const payload = parseJwt(token);
    if (!payload.exp) return true;

    const expiryTime = payload.exp * 1000; // Convert to milliseconds
    const now = Date.now();
    return expiryTime - now < buffer;
  } catch (e) {
    return true;
  }
}

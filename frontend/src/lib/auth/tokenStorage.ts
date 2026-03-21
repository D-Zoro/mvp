export const ACCESS_TOKEN_KEY = "books4all_access_token";
export const REFRESH_TOKEN_KEY = "books4all_refresh_token";

const isBrowser = (): boolean => typeof window !== "undefined";

export const getAccessToken = (): string | null => {
  if (!isBrowser()) return null;
  return localStorage.getItem(ACCESS_TOKEN_KEY);
};

export const getRefreshToken = (): string | null => {
  if (!isBrowser()) return null;
  return localStorage.getItem(REFRESH_TOKEN_KEY);
};

export const setAuthTokens = (tokens: {
  accessToken: string;
  refreshToken: string;
}): void => {
  if (!isBrowser()) return;
  localStorage.setItem(ACCESS_TOKEN_KEY, tokens.accessToken);
  localStorage.setItem(REFRESH_TOKEN_KEY, tokens.refreshToken);
};

export const clearAuthTokens = (): void => {
  if (!isBrowser()) return;
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
};

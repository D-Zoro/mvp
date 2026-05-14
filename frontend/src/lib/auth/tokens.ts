import type { AuthTokens } from "@/types/auth";

export const TOKEN_KEYS = {
  access: "b4a_access",
  refresh: "b4a_refresh",
} as const;

const cookieOptions = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/",
};

export function tokenCookieOptions(maxAge?: number) {
  return { ...cookieOptions, ...(maxAge ? { maxAge } : {}) };
}

export function getBrowserCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  return (
    document.cookie
      .split("; ")
      .find((row) => row.startsWith(`${name}=`))
      ?.split("=")[1] ?? null
  );
}

export function setAuthCookies(response: Response, tokens: AuthTokens) {
  response.headers.append(
    "Set-Cookie",
    `${TOKEN_KEYS.access}=${tokens.access_token}; Path=/; Max-Age=${tokens.expires_in}; SameSite=Lax; HttpOnly${
      process.env.NODE_ENV === "production" ? "; Secure" : ""
    }`,
  );
  response.headers.append(
    "Set-Cookie",
    `${TOKEN_KEYS.refresh}=${tokens.refresh_token}; Path=/; Max-Age=${60 * 60 * 24 * 30}; SameSite=Lax; HttpOnly${
      process.env.NODE_ENV === "production" ? "; Secure" : ""
    }`,
  );
}

export function clearAuthCookies(response: Response) {
  for (const key of Object.values(TOKEN_KEYS)) {
    response.headers.append(
      "Set-Cookie",
      `${key}=; Path=/; Max-Age=0; SameSite=Lax; HttpOnly${process.env.NODE_ENV === "production" ? "; Secure" : ""}`,
    );
  }
}

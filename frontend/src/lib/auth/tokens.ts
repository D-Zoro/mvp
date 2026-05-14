import type { NextResponse } from "next/server";
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

export function setAuthCookies(response: NextResponse, tokens: AuthTokens) {
  response.cookies.set({
    name: TOKEN_KEYS.access,
    value: tokens.access_token,
    ...cookieOptions,
    maxAge: tokens.expires_in,
  });
  response.cookies.set({
    name: TOKEN_KEYS.refresh,
    value: tokens.refresh_token,
    ...cookieOptions,
    maxAge: 60 * 60 * 24 * 30,
  });
}

export function clearAuthCookies(response: NextResponse) {
  for (const key of Object.values(TOKEN_KEYS)) {
    response.cookies.delete(key);
  }
}

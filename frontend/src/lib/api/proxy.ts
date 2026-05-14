import { NextResponse, type NextRequest } from "next/server";
import { ApiRequestError, backendUrl } from "@/lib/api/server-client";
import { clearAuthCookies, setAuthCookies, TOKEN_KEYS } from "@/lib/auth/tokens";
import type { AuthResponse, AuthTokens } from "@/types/auth";

export async function proxyJson<T = unknown>(path: string, init: RequestInit = {}) {
  const response = await fetch(backendUrl(path), {
    ...init,
    headers: init.headers,
    cache: "no-store",
  });
  const text = await response.text();
  const payload = text ? JSON.parse(text) : null;
  if (!response.ok) throw new ApiRequestError(response.statusText, response.status, payload);
  return { payload: payload as T, status: response.status };
}

export function apiErrorResponse(error: unknown) {
  if (error instanceof ApiRequestError) {
    return NextResponse.json(error.payload ?? { detail: error.message }, { status: error.status });
  }
  return NextResponse.json({ detail: "Unexpected server error" }, { status: 500 });
}

export async function forwardJson(req: NextRequest, path: string, method = req.method) {
  try {
    const token = req.cookies.get(TOKEN_KEYS.access)?.value;
    const headers = new Headers({ "Content-Type": "application/json" });
    if (token) headers.set("Authorization", `Bearer ${token}`);
    const body = method === "GET" || method === "HEAD" ? undefined : JSON.stringify(await req.json().catch(() => ({})));
    const result = await proxyJson(path, { method, body, headers });
    return NextResponse.json(result.payload, { status: result.status });
  } catch (error) {
    return apiErrorResponse(error);
  }
}

export async function authResponse(req: NextRequest, path: string) {
  try {
    const { payload, status } = await proxyJson<AuthResponse>(path, {
      method: "POST",
      body: JSON.stringify(await req.json()),
      headers: { "Content-Type": "application/json" },
    });
    const { access_token, refresh_token, token_type, expires_in, ...body } = payload;
    const response = NextResponse.json(body, { status });
    setAuthCookies(response, { access_token, refresh_token, token_type, expires_in } satisfies AuthTokens);
    return response;
  } catch (error) {
    return apiErrorResponse(error);
  }
}

export function logoutResponse() {
  const response = NextResponse.json({ ok: true });
  clearAuthCookies(response);
  return response;
}

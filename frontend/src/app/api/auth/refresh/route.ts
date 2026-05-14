import { NextResponse, type NextRequest } from "next/server";
import { apiErrorResponse, proxyJson } from "@/lib/api/proxy";
import { clearAuthCookies, setAuthCookies, TOKEN_KEYS } from "@/lib/auth/tokens";
import type { AuthTokens } from "@/types/auth";

export async function POST(req: NextRequest) {
  const refresh = req.cookies.get(TOKEN_KEYS.refresh)?.value;
  if (!refresh) {
    const response = NextResponse.json({ detail: "Refresh token missing" }, { status: 401 });
    clearAuthCookies(response);
    return response;
  }

  try {
    const { payload } = await proxyJson<AuthTokens>("/auth/refresh", {
      method: "POST",
      body: JSON.stringify({ refresh_token: refresh }),
      headers: { "Content-Type": "application/json" },
    });
    const { access_token, refresh_token, token_type, expires_in } = payload;
    const response = NextResponse.json({ ok: true });
    setAuthCookies(response, { access_token, refresh_token, token_type, expires_in } satisfies AuthTokens);
    return response;
  } catch (error) {
    const response = apiErrorResponse(error);
    clearAuthCookies(response);
    return response;
  }
}

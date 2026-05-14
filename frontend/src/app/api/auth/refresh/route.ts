import { NextResponse, type NextRequest } from "next/server";
import { apiErrorResponse, proxyJson } from "@/lib/api/proxy";
import { setAuthCookies, TOKEN_KEYS } from "@/lib/auth/tokens";
import type { AuthResponse, AuthTokens } from "@/types/auth";

export async function POST(req: NextRequest) {
  try {
    const refresh = req.cookies.get(TOKEN_KEYS.refresh)?.value;
    const { payload } = await proxyJson<AuthResponse>("/auth/refresh", {
      method: "POST",
      body: JSON.stringify({ refresh_token: refresh }),
      headers: { "Content-Type": "application/json" },
    });
    const { access_token, refresh_token, token_type, expires_in, ...body } = payload;
    const response = NextResponse.json(body);
    setAuthCookies(response, { access_token, refresh_token, token_type, expires_in } satisfies AuthTokens);
    return response;
  } catch (error) {
    return apiErrorResponse(error);
  }
}

import { NextResponse, type NextRequest } from "next/server";
import { apiErrorResponse, proxyJson } from "@/lib/api/proxy";
import { setAuthCookies } from "@/lib/auth/tokens";
import type { AuthResponse, AuthTokens } from "@/types/auth";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    if (body.state !== req.cookies.get("b4a_oauth_state")?.value) return NextResponse.json({ detail: "Invalid OAuth state" }, { status: 400 });
    const { payload } = await proxyJson<AuthResponse>("/auth/google/callback", { method: "POST", body: JSON.stringify(body), headers: { "Content-Type": "application/json" } });
    const { access_token, refresh_token, token_type, expires_in, ...json } = payload;
    const response = NextResponse.json(json);
    setAuthCookies(response, { access_token, refresh_token, token_type, expires_in } satisfies AuthTokens);
    response.cookies.delete("b4a_oauth_state");
    return response;
  } catch (error) {
    return apiErrorResponse(error);
  }
}

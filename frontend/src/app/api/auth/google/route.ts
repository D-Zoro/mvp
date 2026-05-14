import { NextResponse } from "next/server";
import { apiErrorResponse, proxyJson } from "@/lib/api/proxy";

export async function GET() {
  try {
    const { payload } = await proxyJson<{ authorization_url: string; state: string }>("/auth/google", { method: "GET" });
    const response = NextResponse.json(payload);
    response.cookies.set("b4a_oauth_state", payload.state, { httpOnly: true, sameSite: "lax", path: "/", maxAge: 600 });
    return response;
  } catch (error) {
    return apiErrorResponse(error);
  }
}

import { NextResponse, type NextRequest } from "next/server";
import { backendUrl } from "@/lib/api/server-client";
import { TOKEN_KEYS } from "@/lib/auth/tokens";

export async function POST(req: NextRequest) {
  const token = req.cookies.get(TOKEN_KEYS.access)?.value;
  const headers = new Headers();
  if (token) headers.set("Authorization", `Bearer ${token}`);
  const response = await fetch(backendUrl("/upload"), {
    method: "POST",
    body: await req.formData(),
    headers,
  });
  const payload = await response.json().catch(() => ({}));
  return NextResponse.json(payload, { status: response.status });
}

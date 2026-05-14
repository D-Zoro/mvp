import type { NextRequest } from "next/server";
import { forwardJson } from "@/lib/api/proxy";

export async function GET(req: NextRequest) {
  const query = req.nextUrl.searchParams.toString();
  return forwardJson(req, `/orders${query ? `?${query}` : ""}`, "GET");
}

export async function POST(req: NextRequest) {
  return forwardJson(req, "/orders", "POST");
}

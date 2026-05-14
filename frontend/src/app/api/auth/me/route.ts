import type { NextRequest } from "next/server";
import { forwardJson } from "@/lib/api/proxy";

export async function GET(req: NextRequest) {
  return forwardJson(req, "/auth/me", "GET");
}

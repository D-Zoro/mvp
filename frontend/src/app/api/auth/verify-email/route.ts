import type { NextRequest } from "next/server";
import { forwardJson } from "@/lib/api/proxy";

export async function POST(req: NextRequest) {
  return forwardJson(req, "/auth/verify-email", "POST");
}

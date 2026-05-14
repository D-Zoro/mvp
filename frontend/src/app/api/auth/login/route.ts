import type { NextRequest } from "next/server";
import { authResponse } from "@/lib/api/proxy";

export async function POST(req: NextRequest) {
  return authResponse(req, "/auth/login");
}

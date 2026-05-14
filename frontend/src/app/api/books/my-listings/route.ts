import type { NextRequest } from "next/server";
import { forwardJson } from "@/lib/api/proxy";

export async function GET(req: NextRequest) {
  const query = req.nextUrl.searchParams.toString();
  return forwardJson(req, `/books/my-listings${query ? `?${query}` : ""}`, "GET");
}

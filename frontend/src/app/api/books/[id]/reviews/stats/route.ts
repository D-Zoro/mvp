import type { NextRequest } from "next/server";
import { forwardJson } from "@/lib/api/proxy";

export async function GET(req: NextRequest, ctx: RouteContext<"/api/books/[id]/reviews/stats">) {
  const { id } = await ctx.params;
  return forwardJson(req, `/books/${id}/reviews/stats`, "GET");
}

import type { NextRequest } from "next/server";
import { forwardJson } from "@/lib/api/proxy";

export async function GET(req: NextRequest, ctx: RouteContext<"/api/books/[id]/reviews">) {
  const { id } = await ctx.params;
  const query = req.nextUrl.searchParams.toString();
  return forwardJson(req, `/books/${id}/reviews${query ? `?${query}` : ""}`, "GET");
}

export async function POST(req: NextRequest, ctx: RouteContext<"/api/books/[id]/reviews">) {
  const { id } = await ctx.params;
  return forwardJson(req, `/books/${id}/reviews`, "POST");
}

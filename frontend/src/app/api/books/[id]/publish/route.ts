import type { NextRequest } from "next/server";
import { forwardJson } from "@/lib/api/proxy";

export async function POST(req: NextRequest, ctx: RouteContext<"/api/books/[id]/publish">) {
  const { id } = await ctx.params;
  return forwardJson(req, `/books/${id}/publish`, "POST");
}

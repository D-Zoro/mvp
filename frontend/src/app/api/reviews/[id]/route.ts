import type { NextRequest } from "next/server";
import { forwardJson } from "@/lib/api/proxy";

export async function PUT(req: NextRequest, ctx: RouteContext<"/api/reviews/[id]">) {
  const { id } = await ctx.params;
  return forwardJson(req, `/reviews/${id}`, "PUT");
}

export async function DELETE(req: NextRequest, ctx: RouteContext<"/api/reviews/[id]">) {
  const { id } = await ctx.params;
  return forwardJson(req, `/reviews/${id}`, "DELETE");
}

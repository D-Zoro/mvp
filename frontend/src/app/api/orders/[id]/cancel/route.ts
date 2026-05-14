import type { NextRequest } from "next/server";
import { forwardJson } from "@/lib/api/proxy";

export async function POST(req: NextRequest, ctx: RouteContext<"/api/orders/[id]/cancel">) {
  const { id } = await ctx.params;
  return forwardJson(req, `/orders/${id}/cancel`, "POST");
}

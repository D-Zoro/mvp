import type { NextRequest } from "next/server";
import { forwardJson } from "@/lib/api/proxy";

export async function POST(req: NextRequest, ctx: RouteContext<"/api/payments/checkout/[orderId]">) {
  const { orderId } = await ctx.params;
  return forwardJson(req, `/payments/checkout/${orderId}`, "POST");
}

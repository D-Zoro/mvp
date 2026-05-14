import type { NextRequest } from "next/server";
import { forwardJson } from "@/lib/api/proxy";

export async function GET(req: NextRequest, ctx: RouteContext<"/api/books/[id]">) {
  const { id } = await ctx.params;
  return forwardJson(req, `/books/${id}`, "GET");
}

export async function PUT(req: NextRequest, ctx: RouteContext<"/api/books/[id]">) {
  const { id } = await ctx.params;
  return forwardJson(req, `/books/${id}`, "PUT");
}

export async function DELETE(req: NextRequest, ctx: RouteContext<"/api/books/[id]">) {
  const { id } = await ctx.params;
  return forwardJson(req, `/books/${id}`, "DELETE");
}

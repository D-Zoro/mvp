import { NextResponse, type NextRequest } from "next/server";
import { backendUrl } from "@/lib/api/server-client";

export async function POST(req: NextRequest) {
  const body = await req.text();
  const signature = req.headers.get("stripe-signature") ?? "";
  await fetch(backendUrl("/payments/webhook"), {
    method: "POST",
    body,
    headers: {
      "stripe-signature": signature,
      "stripe-webhook-secret": process.env.STRIPE_WEBHOOK_SECRET ?? "",
      "Content-Type": "application/json",
    },
  }).catch(() => undefined);
  return NextResponse.json({ received: true });
}

"use client";

import { CreditCard } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCheckout } from "@/lib/hooks/use-orders";

export function CheckoutButton({ orderId, disabled }: { orderId: string; disabled?: boolean }) {
  const checkout = useCheckout();
  return (
    <Button
      disabled={disabled || checkout.isPending}
      onClick={async () => {
        const session = await checkout.mutateAsync(orderId);
        window.location.assign(session.checkout_url);
      }}
    >
      <CreditCard className="h-4 w-4" /> {checkout.isPending ? "Opening..." : "Pay"}
    </Button>
  );
}

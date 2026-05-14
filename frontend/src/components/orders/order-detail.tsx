import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { PriceDisplay } from "@/components/books/price-display";
import type { Order } from "@/types/order";
import { CheckoutButton } from "./checkout-button";
import { OrderItemRow } from "./order-item-row";
import { OrderStatusBadge } from "./order-status-badge";

export function OrderDetail({ order }: { order: Order }) {
  return (
    <div className="grid gap-6 lg:grid-cols-12">
      <Card className="lg:col-span-8">
        <CardHeader className="flex flex-row items-center justify-between">
          <h2 className="font-serif text-2xl font-semibold leading-snug text-foreground sm:text-3xl">Order items</h2>
          <OrderStatusBadge status={order.status} />
        </CardHeader>
        <CardContent>{order.items.map((item) => <OrderItemRow key={item.id} item={item} />)}</CardContent>
      </Card>
      <Card className="lg:col-span-4">
        <CardHeader><h2 className="font-serif text-2xl font-semibold leading-snug text-foreground sm:text-3xl">Summary</h2></CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="font-sans text-sm text-muted">Total</span>
            <PriceDisplay value={order.total_amount} />
          </div>
          {order.status === "pending" ? <CheckoutButton orderId={order.id} /> : null}
        </CardContent>
      </Card>
    </div>
  );
}

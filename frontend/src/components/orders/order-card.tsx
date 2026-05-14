import Link from "next/link";
import { PriceDisplay } from "@/components/books/price-display";
import { formatDate } from "@/lib/utils/format";
import type { Order } from "@/types/order";
import { OrderStatusBadge } from "./order-status-badge";

export function OrderCard({ order }: { order: Order }) {
  return (
    <Link href={`/orders/${order.id}`} className="block rounded-sm border border-border bg-surface p-4 shadow-sm transition-all duration-200 ease-out hover:-translate-y-1 hover:shadow-md">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="font-mono text-sm text-muted">{order.id}</p>
          <p className="font-sans text-sm text-muted">{formatDate(order.created_at)}</p>
        </div>
        <OrderStatusBadge status={order.status} />
      </div>
      <div className="mt-4 flex items-center justify-between">
        <span className="font-sans text-sm text-muted">{order.items.length} items</span>
        <PriceDisplay value={order.total_amount} />
      </div>
    </Link>
  );
}

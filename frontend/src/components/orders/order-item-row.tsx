import { PriceDisplay } from "@/components/books/price-display";
import type { OrderItem } from "@/types/order";

export function OrderItemRow({ item }: { item: OrderItem }) {
  return (
    <div className="grid grid-cols-[1fr_auto] gap-4 border-b border-border py-3 last:border-b-0">
      <div>
        <p className="font-sans text-sm font-medium text-foreground">{item.book_title}</p>
        <p className="font-sans text-sm text-muted">{item.book_author} x {item.quantity}</p>
      </div>
      <PriceDisplay value={item.price_at_purchase} />
    </div>
  );
}

import { Badge } from "@/components/ui/badge";
import { formatOrderStatus, getOrderStatusColor } from "@/lib/utils/format";
import type { OrderStatus } from "@/types/order";

export function OrderStatusBadge({ status }: { status: OrderStatus }) {
  return <Badge className={getOrderStatusColor(status)}>{formatOrderStatus(status)}</Badge>;
}

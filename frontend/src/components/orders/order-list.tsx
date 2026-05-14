"use client";

import { EmptyState } from "@/components/common/empty-state";
import { useOrders } from "@/lib/hooks/use-orders";
import { OrderCard } from "./order-card";

export function OrderList() {
  const { data, isLoading } = useOrders();
  if (isLoading) return <p className="font-sans text-sm text-muted">Loading orders...</p>;
  if (!data?.items.length) return <EmptyState title="No orders yet" description="Your purchases and payment status will appear here." actionLabel="Browse books" href="/books" />;
  return <div className="grid gap-4">{data.items.map((order) => <OrderCard key={order.id} order={order} />)}</div>;
}

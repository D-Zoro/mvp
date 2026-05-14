import { notFound } from "next/navigation";
import { PageContainer } from "@/components/layout/page-container";
import { OrderDetail } from "@/components/orders/order-detail";
import { serverFetch } from "@/lib/api/server-client";
import type { Order } from "@/types/order";

export default async function OrderPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  let order: Order;
  try {
    order = await serverFetch<Order>(`/orders/${id}`);
  } catch {
    notFound();
  }
  return (
    <PageContainer className="py-8">
      <h1 className="mb-8 font-serif text-4xl font-bold leading-tight tracking-tight text-foreground sm:text-5xl">Order detail</h1>
      <OrderDetail order={order} />
    </PageContainer>
  );
}

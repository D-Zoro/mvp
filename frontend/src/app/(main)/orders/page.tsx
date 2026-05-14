import { PageContainer } from "@/components/layout/page-container";
import { OrderList } from "@/components/orders/order-list";

export default function OrdersPage() {
  return (
    <PageContainer className="py-8">
      <h1 className="mb-8 font-serif text-4xl font-bold leading-tight tracking-tight text-foreground sm:text-5xl">Orders</h1>
      <OrderList />
    </PageContainer>
  );
}

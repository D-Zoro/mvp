import { PageContainer } from "@/components/layout/page-container";
import { Button } from "@/components/ui/button";

export default function PaymentCancelPage() {
  return (
    <PageContainer className="flex min-h-[70vh] flex-col items-start justify-center gap-4">
      <h1 className="font-serif text-4xl font-bold leading-tight tracking-tight text-foreground sm:text-5xl">Payment cancelled</h1>
      <p className="font-sans text-base leading-relaxed text-foreground">No payment was collected. You can return to orders and try again.</p>
      <Button asChild href="/orders">Back to orders</Button>
    </PageContainer>
  );
}

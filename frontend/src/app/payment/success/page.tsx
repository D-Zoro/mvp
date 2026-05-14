import { CheckCircle2 } from "lucide-react";
import { PageContainer } from "@/components/layout/page-container";
import { Button } from "@/components/ui/button";

export default function PaymentSuccessPage() {
  return (
    <PageContainer className="flex min-h-[70vh] flex-col items-start justify-center gap-4">
      <CheckCircle2 className="h-10 w-10 text-success" />
      <h1 className="font-serif text-4xl font-bold leading-tight tracking-tight text-foreground sm:text-5xl">Payment successful</h1>
      <p className="font-sans text-base leading-relaxed text-foreground">Your order is being confirmed by the payment processor.</p>
      <Button asChild href="/orders">View orders</Button>
    </PageContainer>
  );
}

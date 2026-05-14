import { PageContainer } from "@/components/layout/page-container";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <PageContainer className="flex min-h-[70vh] flex-col items-start justify-center gap-4">
      <p className="font-sans text-sm leading-normal text-muted">404</p>
      <h1 className="font-serif text-4xl font-bold leading-tight tracking-tight text-foreground sm:text-5xl">Page not found</h1>
      <Button asChild href="/books">Browse books</Button>
    </PageContainer>
  );
}

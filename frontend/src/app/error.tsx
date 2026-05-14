"use client";

import { Button } from "@/components/ui/button";
import { PageContainer } from "@/components/layout/page-container";

export default function Error({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <PageContainer className="flex min-h-[70vh] flex-col items-start justify-center gap-4">
      <h1 className="font-serif text-4xl font-bold leading-tight tracking-tight text-foreground sm:text-5xl">Something went wrong</h1>
      <Button onClick={reset}>Try again</Button>
    </PageContainer>
  );
}

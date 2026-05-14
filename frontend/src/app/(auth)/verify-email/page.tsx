"use client";

import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { useVerifyEmail } from "@/lib/hooks/use-auth";
import { Button } from "@/components/ui/button";

function VerifyEmailContent() {
  const token = useSearchParams().get("token") ?? "";
  const verify = useVerifyEmail();
  return (
    <div className="w-full max-w-md rounded-sm border border-border bg-surface p-6 shadow-sm">
      <h1 className="font-serif text-4xl font-bold leading-tight tracking-tight text-foreground sm:text-5xl">Verify email</h1>
      <p className="mt-2 font-sans text-sm text-muted">{verify.isSuccess ? "Your email is verified." : "Confirm your email address."}</p>
      <Button className="mt-4" disabled={!token || verify.isPending || verify.isSuccess} onClick={() => verify.mutate({ token })}>Verify</Button>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense>
      <VerifyEmailContent />
    </Suspense>
  );
}

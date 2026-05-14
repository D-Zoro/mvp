"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useForgotPassword } from "@/lib/hooks/use-auth";

export function ForgotPasswordForm() {
  const forgot = useForgotPassword();
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  return (
    <form className="w-full max-w-md space-y-4 rounded-sm border border-border bg-surface p-6 shadow-sm" onSubmit={async (event) => {
      event.preventDefault();
      await forgot.mutateAsync({ email }).catch(() => undefined);
      setSent(true);
    }}>
      <h1 className="font-serif text-4xl font-bold leading-tight tracking-tight text-foreground sm:text-5xl">Reset password</h1>
      {sent ? <p className="font-sans text-sm text-muted">Check your email for reset instructions.</p> : <Input type="email" required placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />}
      <Button className="w-full" type="submit" disabled={sent || forgot.isPending}>{sent ? "Email sent" : "Send reset link"}</Button>
    </form>
  );
}

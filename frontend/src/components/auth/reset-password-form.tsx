"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useResetPassword } from "@/lib/hooks/use-auth";

export function ResetPasswordForm() {
  const token = useSearchParams().get("token") ?? "";
  const router = useRouter();
  const reset = useResetPassword();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  return (
    <form className="w-full max-w-md space-y-4 rounded-sm border border-border bg-surface p-6 shadow-sm" onSubmit={async (event) => {
      event.preventDefault();
      if (password !== confirm) return;
      await reset.mutateAsync({ token, new_password: password });
      router.push("/login");
    }}>
      <h1 className="font-serif text-4xl font-bold leading-tight tracking-tight text-foreground sm:text-5xl">New password</h1>
      <Input type="password" required minLength={8} placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} />
      <Input type="password" required minLength={8} placeholder="Confirm password" value={confirm} onChange={(e) => setConfirm(e.target.value)} />
      {password && confirm && password !== confirm ? <p className="font-sans text-sm text-primary">Passwords do not match.</p> : null}
      <Button className="w-full" disabled={!token || reset.isPending}>Update password</Button>
    </form>
  );
}

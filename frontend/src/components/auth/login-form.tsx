"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useLogin } from "@/lib/hooks/use-auth";
import { useAuthStore } from "@/store/auth.store";

export function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const login = useLogin();
  const setUser = useAuthStore((state) => state.setUser);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  return (
    <form
      className="w-full max-w-md space-y-4 rounded-sm border border-border bg-surface p-6 shadow-sm"
      onSubmit={async (event) => {
        event.preventDefault();
        const result = await login.mutateAsync({ email, password });
        setUser(result.user);
        router.push(params.get("redirect") ?? "/books");
      }}
    >
      <div>
        <h1 className="font-serif text-4xl font-bold leading-tight tracking-tight text-foreground sm:text-5xl">Login</h1>
        <p className="mt-2 font-sans text-sm leading-normal text-muted">Access your orders and listings.</p>
      </div>
      <Input type="email" placeholder="Email" required value={email} onChange={(e) => setEmail(e.target.value)} />
      <Input type="password" placeholder="Password" required value={password} onChange={(e) => setPassword(e.target.value)} />
      {login.isError ? <p className="font-sans text-sm text-primary">Could not login with those credentials.</p> : null}
      <Button className="w-full" type="submit" disabled={login.isPending}>{login.isPending ? "Logging in..." : "Login"}</Button>
      <div className="flex justify-between font-sans text-sm text-foreground">
        <Link href="/register">Create account</Link>
        <Link href="/forgot-password">Forgot password</Link>
      </div>
    </form>
  );
}

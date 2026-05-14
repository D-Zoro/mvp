"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { useRegister } from "@/lib/hooks/use-auth";
import { useAuthStore } from "@/store/auth.store";
import type { UserRole } from "@/types/auth";

export function RegisterForm() {
  const router = useRouter();
  const register = useRegister();
  const setUser = useAuthStore((state) => state.setUser);
  const [role, setRole] = useState<UserRole>("buyer");
  const [form, setForm] = useState({ email: "", password: "", first_name: "", last_name: "" });
  return (
    <form className="w-full max-w-md space-y-4 rounded-sm border border-border bg-surface p-6 shadow-sm" onSubmit={async (event) => {
      event.preventDefault();
      const result = await register.mutateAsync({ ...form, role });
      setUser(result.user);
      router.push("/books");
    }}>
      <h1 className="font-serif text-4xl font-bold leading-tight tracking-tight text-foreground sm:text-5xl">Register</h1>
      <div className="grid grid-cols-2 gap-3">
        <Input placeholder="First name" value={form.first_name} onChange={(e) => setForm({ ...form, first_name: e.target.value })} />
        <Input placeholder="Last name" value={form.last_name} onChange={(e) => setForm({ ...form, last_name: e.target.value })} />
      </div>
      <Input type="email" placeholder="Email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
      <Input type="password" placeholder="Password" required minLength={8} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
      <Select value={role} onChange={(e) => setRole(e.target.value as UserRole)}>
        <option value="buyer">Buyer</option>
        <option value="seller">Seller</option>
      </Select>
      {register.isError ? <p className="font-sans text-sm text-primary">Could not create the account.</p> : null}
      <Button className="w-full" type="submit" disabled={register.isPending}>{register.isPending ? "Creating..." : "Create account"}</Button>
    </form>
  );
}

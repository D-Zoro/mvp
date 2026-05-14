"use client";

import { useEffect } from "react";
import { useMe } from "@/lib/hooks/use-auth";
import { useAuthStore } from "@/store/auth.store";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const setUser = useAuthStore((state) => state.setUser);
  const { data, isError, isLoading } = useMe({ retry: false });
  useEffect(() => {
    if (!isLoading) setUser(isError ? null : (data ?? null));
  }, [data, isError, isLoading, setUser]);
  return children;
}

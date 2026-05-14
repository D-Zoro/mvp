"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Spinner } from "@/components/ui/spinner";
import { apiClient } from "@/lib/api/client";
import { API } from "@/lib/api/endpoints";
import { queryKeys } from "@/lib/query/keys";
import { useAuthStore } from "@/store/auth.store";
import type { User } from "@/types/auth";

export function OAuthCallback({ provider }: { provider: "google" | "github" }) {
  const router = useRouter();
  const params = useSearchParams();
  const submittedRef = useRef(false);
  const queryClient = useQueryClient();
  const setUser = useAuthStore((state) => state.setUser);

  useEffect(() => {
    if (submittedRef.current) return;

    const code = params.get("code");
    const state = params.get("state");
    if (!code) {
      router.replace("/login");
      return;
    }

    submittedRef.current = true;
    const url = provider === "google" ? API.auth.googleCallback : API.auth.githubCallback;

    apiClient
      .post<{ user: User }>(url, { code, state })
      .then(({ data }) => {
        setUser(data.user);
        queryClient.setQueryData(queryKeys.auth.me(), data.user);
        router.replace("/books");
      })
      .catch(() => router.replace("/login"));
  }, [params, provider, queryClient, router, setUser]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <Spinner className="h-8 w-8" />
    </div>
  );
}

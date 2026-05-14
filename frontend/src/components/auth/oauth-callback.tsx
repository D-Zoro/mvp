"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef } from "react";
import { Spinner } from "@/components/ui/spinner";
import { apiClient } from "@/lib/api/client";
import { API } from "@/lib/api/endpoints";

export function OAuthCallback({ provider }: { provider: "google" | "github" }) {
  const router = useRouter();
  const params = useSearchParams();
  const submittedRef = useRef(false);

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
      .post(url, { code, state })
      .then(() => router.replace("/books"))
      .catch(() => router.replace("/login"));
  }, [params, provider, router]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <Spinner className="h-8 w-8" />
    </div>
  );
}

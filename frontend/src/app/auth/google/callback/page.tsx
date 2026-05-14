"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect } from "react";
import { apiClient } from "@/lib/api/client";
import { API } from "@/lib/api/endpoints";
import { Spinner } from "@/components/ui/spinner";

function Callback({ provider }: { provider: "google" | "github" }) {
  const router = useRouter();
  const params = useSearchParams();
  useEffect(() => {
    const code = params.get("code");
    const state = params.get("state");
    if (!code || !state) return;
    const url = provider === "google" ? API.auth.googleCallback : API.auth.githubCallback;
    apiClient.post(url, { code, state }).then(() => router.replace("/books")).catch(() => router.replace("/login"));
  }, [params, provider, router]);
  return <div className="flex min-h-screen items-center justify-center bg-background"><Spinner className="h-8 w-8" /></div>;
}

export default function GoogleCallbackPage() {
  return <Suspense><Callback provider="google" /></Suspense>;
}

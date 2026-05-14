"use client";

import { GitBranch } from "lucide-react";
import { Button } from "@/components/ui/button";
import { apiClient } from "@/lib/api/client";
import { API } from "@/lib/api/endpoints";

async function redirectTo(url: string) {
  const { data } = await apiClient.get<{ authorization_url: string; state?: string }>(url);
  if (data.state) sessionStorage.setItem("oauth_state", data.state);
  window.location.assign(data.authorization_url);
}

export function OAuthButtons() {
  if (process.env.NEXT_PUBLIC_ENABLE_OAUTH !== "true") return null;
  return (
    <div className="grid gap-2">
      <Button variant="secondary" type="button" onClick={() => void redirectTo(API.auth.googleUrl)}>Continue with Google</Button>
      <Button variant="secondary" type="button" onClick={() => void redirectTo(API.auth.githubUrl)}>
        <GitBranch className="h-4 w-4" /> Continue with GitHub
      </Button>
    </div>
  );
}

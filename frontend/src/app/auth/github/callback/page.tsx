"use client";

import { Suspense } from "react";
import { OAuthCallback } from "@/components/auth/oauth-callback";

export default function GithubCallbackPage() {
  return (
    <Suspense>
      <OAuthCallback provider="github" />
    </Suspense>
  );
}

"use client";

import { Suspense } from "react";
import { OAuthCallback } from "@/components/auth/oauth-callback";

export default function GoogleCallbackPage() {
  return (
    <Suspense>
      <OAuthCallback provider="google" />
    </Suspense>
  );
}

import { Suspense } from "react";
import { LoginForm } from "@/components/auth/login-form";
import { OAuthButtons } from "@/components/auth/oauth-buttons";

export default function LoginPage() {
  return (
    <div className="w-full max-w-md space-y-4">
      <Suspense>
        <LoginForm />
      </Suspense>
      <OAuthButtons />
    </div>
  );
}
